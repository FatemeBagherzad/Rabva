import { RESEARCH_NODE_TYPES, useResearchCanvas } from './useResearchCanvas';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchResearch, saveResearch, resolveAyahAddressToWords } from '../../services/researchService';
import CanvasContextMenu from './CanvasContextMenu';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import './ResearchCanvas.scss';

const LONG_PRESS_MS = 600;
const LONG_PRESS_TOLERANCE_PX = 10;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_TOLERANCE_PX = 24;

const CONNECTION_SIDES = ['top', 'right', 'bottom', 'left'];
const SUBSET_GROUP_PREFIX = 'sg:';
const connectionPointId = (ownerId, side) => `${ownerId}:cp:${side}`;
const ownerIdFromPointId = (pointId) => pointId.split(':cp:')[0];
const nodeIdFromSelectableId = (id) => {
  const match = id.match(/^n:([^:]+):/);
  return match ? match[1] : null;
};

// Owner-kind classification (Phase 1 plan #13 dot-set rule).
const ownerKindFromOwnerId = (ownerId) => {
  if (!ownerId) return 'group';
  if (String(ownerId).startsWith(SUBSET_GROUP_PREFIX)) return 'group';
  const rest = String(ownerId).split(':').slice(2).join(':');
  if (!rest || rest === 'group' || rest === 'meta') return 'group';
  if (rest.startsWith('w:')) return 'word';
  if (rest.startsWith('s:')) return 'segment';
  return 'group';
};
// Connection-point sides per owner kind:
//  - word     -> top + bottom only
//  - segment  -> bottom only
//  - group / meta / subset-group -> full 4 (perimeter)
const sidesForOwnerId = (ownerId) => {
  const kind = ownerKindFromOwnerId(ownerId);
  if (kind === 'word') return ['top', 'bottom'];
  if (kind === 'segment') return ['bottom'];
  return CONNECTION_SIDES;
};
const defaultSideForOwnerId = (ownerId) => sidesForOwnerId(ownerId)[0];

const buildSubsetGroupId = (nodeId, itemIds) => `${SUBSET_GROUP_PREFIX}${nodeId}:${itemIds.join('|')}`;

const snapshotToKey = (snapshot) =>
  JSON.stringify({
    pan: snapshot.pan,
    scale: snapshot.scale,
    nodes: snapshot.nodes,
    connections: snapshot.connections,
    connectionDirection: snapshot.connectionDirection,
  });


const ResearchCanvas = ({ preferences, surahs, researchId, onBackToHub }) => {
  const { token } = useAuth();
  const selectableRefs = useRef(new Map());
  const connectionPointRefs = useRef(new Map());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionPreviewIds, setSelectionPreviewIds] = useState([]);
  const [selectionGroups, setSelectionGroups] = useState([]);
  const [selectionGroupRects, setSelectionGroupRects] = useState({});
  const [connectionDirection, setConnectionDirection] = useState('uni');
  const [connections, setConnections] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [hoveredConnectionId, setHoveredConnectionId] = useState(null);
  const [connectionEditDraft, setConnectionEditDraft] = useState(null);
  const [anchors, setAnchors] = useState({});
  const [ownerRects, setOwnerRects] = useState({});
  const [connectionDraft, setConnectionDraft] = useState(null);
  const [hoveredConnectionPointId, setHoveredConnectionPointId] = useState(null);
  const [hoveredOwnerId, setHoveredOwnerId] = useState(null);
  const [marquee, setMarquee] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, kind, ids }
  // Phase 1 plan #18: every Delete action must be confirmed before any
  // mutation. `pendingDelete` is the menu being confirmed (same shape as
  // `contextMenu`); when set, the DeleteConfirmDialog is shown.
  const [pendingDelete, setPendingDelete] = useState(null);
  const [armedSourceOwnerId, setArmedSourceOwnerId] = useState(null);
  const lastTapRef = useRef(null); // { ownerId, t, x, y }
  const lastEmptyTapRef = useRef(null); // { t, x, y }
  const longPressRef = useRef(null); // { timer, startX, startY, kind, ids }
  const hasHydratedRef = useRef(false);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const isApplyingHistoryRef = useRef(false);
  const saveTimerRef = useRef(null);
  const [researchName, setResearchName] = useState('');
  const newDroppedNodeIdRef = useRef(null);

  const {
    viewportRef,
    pan,
    scale,
    nodes,
    canvasStyles,
    zoomBy,
    onViewportWheel,
    onViewportPointerDownCapture,
    onViewportPointerMoveCapture,
    onViewportPointerEndCapture,
    startPanDrag,
    movePanDrag,
    stopPanDrag,
    onTemplateDragStart,
    onDropToSurface,
    onAllowDrop,
    placeNodeAtClientPoint,
    updateNode,
    onPlaceholderKeyDown,
    onPlaceholderFocus,
    onPlaceholderBlur,
    onNodePointerDown,
    onResizeHandlePointerDown,
    setResearchState,
    focusNodeById,
    deleteNodesByIds,
  } = useResearchCanvas(preferences, { selectionMode });
  const [tapDropMode, setTapDropMode] = useState(false);

  const isMobileLike = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse), (max-width: 900px)').matches;
  }, []);

  const setSelectableRef = (id) => (element) => {
    if (!element) {
      selectableRefs.current.delete(id);
      return;
    }
    selectableRefs.current.set(id, element);
  };

  const setConnectionPointRef = (id) => (element) => {
    if (!element) {
      connectionPointRefs.current.delete(id);
      return;
    }

    connectionPointRefs.current.set(id, element);
  };

  const toggleSelected = (id) => {
    if (id.startsWith(SUBSET_GROUP_PREFIX)) {
      setSelectionGroups((prev) => prev.filter((group) => group.id !== id));
    }
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const clearSelectionState = () => {
    setSelectedIds([]);
    setSelectionPreviewIds([]);
    setSelectionGroups([]);
    setSelectedConnectionId(null);
  };

  const collectIntersectingSelectableIds = (selectionRect) => {
    const nextSelected = [];
    selectableRefs.current.forEach((element, id) => {
      if (id.endsWith(':group') || id.startsWith(SUBSET_GROUP_PREFIX)) return;

      const rect = element.getBoundingClientRect();
      const intersects =
        rect.right >= selectionRect.left &&
        rect.left <= selectionRect.right &&
        rect.bottom >= selectionRect.top &&
        rect.top <= selectionRect.bottom;
      if (intersects) nextSelected.push(id);
    });
    return nextSelected;
  };

  const syncHistoryFlags = () => {
    setCanUndo(historyRef.current.length > 1);
    setCanRedo(redoRef.current.length > 0);
  };

  const applySnapshot = (snapshot) => {
    if (!snapshot) return;

    isApplyingHistoryRef.current = true;
    setResearchState({
      pan: snapshot.pan,
      scale: snapshot.scale,
      nodes: snapshot.nodes,
    });
    setConnections(snapshot.connections || []);
    setConnectionDirection(snapshot.connectionDirection || 'uni');
    setSelectedConnectionId(null);
    setSelectedIds([]);
    setSelectionPreviewIds([]);
    setSelectionGroups([]);
    setConnectionDraft(null);
    setConnectionEditDraft(null);
    setHoveredConnectionPointId(null);
  };

  const performUndo = () => {
    if (historyRef.current.length < 2) return;

    const current = historyRef.current.pop();
    if (current) redoRef.current.push(current);
    const previous = historyRef.current[historyRef.current.length - 1];
    if (previous) applySnapshot(previous.snapshot);
    syncHistoryFlags();
  };

  const performRedo = () => {
    if (!redoRef.current.length) return;
    const next = redoRef.current.pop();
    if (!next) return;
    historyRef.current.push(next);
    applySnapshot(next.snapshot);
    syncHistoryFlags();
  };

  const startConnectionEndpointEdit = (event, connectionId, endpoint) => {
    const connection = connections.find((item) => item.id === connectionId);
    if (!connection) return;

    event.preventDefault();
    event.stopPropagation();

    if (viewportRef.current?.setPointerCapture) {
      try {
        viewportRef.current.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore capture failures.
      }
    }

    const movingPointId = endpoint === 'source' ? connection.sourcePointId : connection.targetPointId;
    const fixedPointId = endpoint === 'source' ? connection.targetPointId : connection.sourcePointId;
    const movingAnchor = anchors[movingPointId] || clientToCanvasPoint(event.clientX, event.clientY);
    if (!movingAnchor) return;

    setSelectedConnectionId(connectionId);
    setConnectionEditDraft({
      pointerId: event.pointerId,
      connectionId,
      endpoint,
      movingPointId,
      fixedPointId,
      x: movingAnchor.x,
      y: movingAnchor.y,
    });
    setHoveredConnectionPointId(null);
  };

  const findNearestConnectionPointId = (point, sourcePointId) => {
    if (!point) return null;

    const maxDistance = 26 / scale;
    let nearestId = null;
    let nearestDistance = Infinity;

    Object.entries(anchors).forEach(([pointId, anchor]) => {
      if (pointId === sourcePointId) return;

      const distance = Math.hypot(anchor.x - point.x, anchor.y - point.y);
      if (distance <= maxDistance && distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = pointId;
      }
    });

    return nearestId;
  };

  // Connection routing (Phase 1 plan #13 + Universal Principle #12 — Scale-first canvas).
  // Default routing is cheap analytic, NOT grid-A*: per connection we pick
  // the dot pair (top/bottom on words; bottom on segments; full perimeter on
  // group/meta) using an O(1) heuristic, then render either a straight line
  // or a single-bend orthogonal "L". Total cost is O(visible connections).
  // Stronger obstacle-aware routing is deferred to a later, opt-in,
  // viewport-bounded, off-main-thread phase per principle #12.
  const connectionPaths = useMemo(() => {
    const result = {};
    if (!connections.length) return result;

    const rectCenter = (r) => (r ? { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 } : null);

    // O(1) dot-pair pick: among the (sourceSides x targetSides) cartesian
    // product (max 4x4 = 16 cheap arithmetic comparisons), choose the pair
    // whose anchors yield the shortest straight-line segment that points
    // outward from each owner rect (i.e. away from the rect's center on the
    // chosen side). This is local arithmetic only — no global search.
    const pickDotPair = (sourceOwnerId, targetOwnerId, sourceRect, targetRect) => {
      const sSides = sidesForOwnerId(sourceOwnerId);
      const tSides = sidesForOwnerId(targetOwnerId);
      let best = null;
      for (let i = 0; i < sSides.length; i += 1) {
        const sPid = `${sourceOwnerId}:cp:${sSides[i]}`;
        const sa = anchors[sPid];
        if (!sa) continue;
        for (let j = 0; j < tSides.length; j += 1) {
          const tPid = `${targetOwnerId}:cp:${tSides[j]}`;
          const ta = anchors[tPid];
          if (!ta) continue;
          // Score: straight-line distance + small penalty if either endpoint's
          // outward direction points back toward its own rect interior.
          const dx = ta.x - sa.x;
          const dy = ta.y - sa.y;
          const dist = Math.hypot(dx, dy);
          let penalty = 0;
          if (sourceRect) {
            const c = rectCenter(sourceRect);
            // Outward = anchor - center. Penalize if (target - anchor) dotted
            // with that outward vector is negative (target is on the wrong side).
            const ox = sa.x - c.x;
            const oy = sa.y - c.y;
            if (ox * dx + oy * dy < 0) penalty += 40;
          }
          if (targetRect) {
            const c = rectCenter(targetRect);
            const ox = ta.x - c.x;
            const oy = ta.y - c.y;
            if (ox * (-dx) + oy * (-dy) < 0) penalty += 40;
          }
          const score = dist + penalty;
          if (!best || score < best.score) {
            best = { sa, ta, score, sSide: sSides[i], tSide: tSides[j] };
          }
        }
      }
      return best;
    };

    // Build polyline: straight if (near-)collinear; otherwise single-bend L.
    // Bend direction is chosen so the line leaves each endpoint perpendicular
    // to its chosen side when possible (vertical if side is top/bottom,
    // horizontal if side is left/right).
    const buildPolyline = (sa, ta, sSide, tSide) => {
      // Straight line shortcut.
      if (Math.abs(sa.x - ta.x) < 0.5 || Math.abs(sa.y - ta.y) < 0.5) {
        return [sa, ta];
      }
      const sourceVertical = sSide === 'top' || sSide === 'bottom';
      const targetVertical = tSide === 'top' || tSide === 'bottom';
      // Two L variants: horizontal-then-vertical OR vertical-then-horizontal.
      // Prefer the one matching the source side: vertical first if source
      // exits top/bottom, horizontal first otherwise.
      if (sourceVertical && !targetVertical) {
        // V then H — bend at (sa.x, ta.y).
        return [sa, { x: sa.x, y: ta.y }, ta];
      }
      if (!sourceVertical && targetVertical) {
        // H then V — bend at (ta.x, sa.y).
        return [sa, { x: ta.x, y: sa.y }, ta];
      }
      if (sourceVertical && targetVertical) {
        // Both ends vertical — V then H then V (mid Y midpoint).
        const midY = (sa.y + ta.y) / 2;
        return [sa, { x: sa.x, y: midY }, { x: ta.x, y: midY }, ta];
      }
      // Both horizontal — H then V then H (mid X midpoint).
      const midX = (sa.x + ta.x) / 2;
      return [sa, { x: midX, y: sa.y }, { x: midX, y: ta.y }, ta];
    };

    for (let i = 0; i < connections.length; i += 1) {
      const conn = connections[i];
      const sourceOwnerId = ownerIdFromPointId(conn.sourcePointId);
      const targetOwnerId = ownerIdFromPointId(conn.targetPointId);
      const sourceRect = ownerRects[sourceOwnerId];
      const targetRect = ownerRects[targetOwnerId];

      const pair = pickDotPair(sourceOwnerId, targetOwnerId, sourceRect, targetRect);
      if (pair) {
        result[conn.id] = buildPolyline(pair.sa, pair.ta, pair.sSide, pair.tSide);
        continue;
      }
      // Fallback: stored anchors or rect centers.
      const sFallback = anchors[conn.sourcePointId] || rectCenter(sourceRect);
      const tFallback = anchors[conn.targetPointId] || rectCenter(targetRect);
      if (sFallback && tFallback) result[conn.id] = [sFallback, tFallback];
    }

    return result;
  }, [connections, anchors, ownerRects]);

  const polylineToPath = (pts) => {
    if (!pts || pts.length < 2) return null;
    return `M ${pts[0].x} ${pts[0].y} ` +
      pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
  };

  const connectionPathData = (sourcePointId, targetPointId, connectionId) => {
    // Phase 1 plan #13: self-referencing connection (source dot and target dot
    // belong to the SAME ayah node) must render as a smooth curve, not a
    // straight or L polyline. Cost remains O(1) per connection.
    const sOwner = ownerIdFromPointId(sourcePointId);
    const tOwner = ownerIdFromPointId(targetPointId);
    const sNodeId = nodeIdFromSelectableId(sOwner);
    const tNodeId = nodeIdFromSelectableId(tOwner);
    if (sNodeId && tNodeId && sNodeId === tNodeId) {
      const sa = anchors[sourcePointId];
      const ta = anchors[targetPointId];
      const cardRect = ownerRects[`n:${sNodeId}:group`];
      if (sa && ta) {
        // Bulge perpendicular to the chord, away from the card center.
        const mx = (sa.x + ta.x) / 2;
        const my = (sa.y + ta.y) / 2;
        const dx = ta.x - sa.x;
        const dy = ta.y - sa.y;
        const len = Math.hypot(dx, dy) || 1;
        // Perpendicular unit vector.
        let nx = -dy / len;
        let ny = dx / len;
        // Flip so the bulge points away from the card center.
        if (cardRect) {
          const cx = (cardRect.left + cardRect.right) / 2;
          const cy = (cardRect.top + cardRect.bottom) / 2;
          if ((mx - cx) * nx + (my - cy) * ny < 0) {
            nx = -nx;
            ny = -ny;
          }
        }
        // Offset proportional to chord length, with sensible min/max.
        const offset = Math.max(28, Math.min(120, len * 0.6));
        const cx = mx + nx * offset;
        const cy2 = my + ny * offset;
        return `M ${sa.x} ${sa.y} Q ${cx} ${cy2} ${ta.x} ${ta.y}`;
      }
    }

    if (connectionId && connectionPaths[connectionId]) {
      return polylineToPath(connectionPaths[connectionId]);
    }
    const source = anchors[sourcePointId];
    const target = anchors[targetPointId];
    if (!source || !target) return null;
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  };

  // Phase 1 plan #13: when a connection is hovered or selected, both of its
  // endpoint elements (and, for whole-ayah endpoints, the ayah-card frame)
  // visually emphasize. Compute the set of emphasized owner-ids in O(1) per
  // emphasized connection (we only inspect at most 2 connections).
  const emphasizedOwnerIds = useMemo(() => {
    const set = new Set();
    const emphasizedIds = [];
    if (selectedConnectionId) emphasizedIds.push(selectedConnectionId);
    if (hoveredConnectionId && hoveredConnectionId !== selectedConnectionId) {
      emphasizedIds.push(hoveredConnectionId);
    }
    if (!emphasizedIds.length) return set;
    for (let i = 0; i < connections.length; i += 1) {
      const c = connections[i];
      if (!emphasizedIds.includes(c.id)) continue;
      set.add(ownerIdFromPointId(c.sourcePointId));
      set.add(ownerIdFromPointId(c.targetPointId));
    }
    return set;
  }, [connections, selectedConnectionId, hoveredConnectionId]);

  const clientToCanvasPoint = (clientX, clientY) => {
    const viewport = viewportRef.current;
    if (!viewport) return null;
    const viewportRect = viewport.getBoundingClientRect();
    return {
      x: (clientX - viewportRect.left - pan.x) / scale,
      y: (clientY - viewportRect.top - pan.y) / scale,
    };
  };

  const startConnectionFromPoint = (event, sourcePointId) => {
    event.preventDefault();
    event.stopPropagation();

    const sourceAnchor = anchors[sourcePointId] || clientToCanvasPoint(event.clientX, event.clientY);
    if (!sourceAnchor) return;

    if (viewportRef.current?.setPointerCapture) {
      try {
        viewportRef.current.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore capture failures.
      }
    }

    setConnectionDraft({
      pointerId: event.pointerId,
      sourcePointId,
      x: sourceAnchor.x,
      y: sourceAnchor.y,
    });
    setHoveredConnectionPointId(null);
  };

  const onConnectionPointerMoveCapture = (event) => {
    if (connectionEditDraft && event.pointerId === connectionEditDraft.pointerId) {
      const nextPoint = clientToCanvasPoint(event.clientX, event.clientY);
      if (!nextPoint) return;

      const nearestPointId = findNearestConnectionPointId(nextPoint, connectionEditDraft.fixedPointId);
      const snappedPoint = nearestPointId ? anchors[nearestPointId] : nextPoint;
      setHoveredConnectionPointId(nearestPointId);

      setConnectionEditDraft((prev) =>
        prev
          ? {
              ...prev,
              x: snappedPoint.x,
              y: snappedPoint.y,
            }
          : prev,
      );
      event.preventDefault();
      return;
    }

    if (!connectionDraft || event.pointerId !== connectionDraft.pointerId) return;
    const nextPoint = clientToCanvasPoint(event.clientX, event.clientY);
    if (!nextPoint) return;

    const nearestPointId = findNearestConnectionPointId(nextPoint, connectionDraft.sourcePointId);
    const snappedPoint = nearestPointId ? anchors[nearestPointId] : nextPoint;
    setHoveredConnectionPointId(nearestPointId);

    setConnectionDraft((prev) =>
      prev
        ? {
            ...prev,
            x: snappedPoint.x,
            y: snappedPoint.y,
          }
        : prev,
    );
    event.preventDefault();
  };

  const onConnectionPointerEndCapture = (event) => {
    if (connectionEditDraft && event.pointerId === connectionEditDraft.pointerId) {
      if (
        hoveredConnectionPointId &&
        hoveredConnectionPointId !== connectionEditDraft.fixedPointId
      ) {
        setConnections((prev) =>
          prev.map((connection) => {
            if (connection.id !== connectionEditDraft.connectionId) return connection;

            if (connectionEditDraft.endpoint === 'source') {
              return { ...connection, sourcePointId: hoveredConnectionPointId };
            }

            return { ...connection, targetPointId: hoveredConnectionPointId };
          }),
        );
      }

      if (viewportRef.current?.releasePointerCapture) {
        try {
          viewportRef.current.releasePointerCapture(event.pointerId);
        } catch (error) {
          // Ignore release failures.
        }
      }

      setConnectionEditDraft(null);
      setHoveredConnectionPointId(null);
      event.preventDefault();
      return;
    }

    if (!connectionDraft || event.pointerId !== connectionDraft.pointerId) return;

    if (
      hoveredConnectionPointId &&
      hoveredConnectionPointId !== connectionDraft.sourcePointId
    ) {
      setConnections((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          direction: connectionDirection,
          sourcePointId: connectionDraft.sourcePointId,
          targetPointId: hoveredConnectionPointId,
        },
      ]);
    }

    if (viewportRef.current?.releasePointerCapture) {
      try {
        viewportRef.current.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Ignore release failures.
      }
    }

    setConnectionDraft(null);
    setHoveredConnectionPointId(null);
    event.preventDefault();
  };

  const renderConnectionPoints = (ownerId) => (
    <span className="research-canvas__connection-points" aria-hidden="true">
      {sidesForOwnerId(ownerId).map((side) => {
        const pointId = connectionPointId(ownerId, side);
        return (
          <button
            key={pointId}
            type="button"
            ref={setConnectionPointRef(pointId)}
            className={`research-canvas__connection-point research-canvas__connection-point--${side} ${
              hoveredConnectionPointId === pointId ? 'is-hovered' : ''
            }`}
            data-owner-id={ownerId}
            onPointerDown={(event) => {
              // Phase 1 plan #17: if a connection is already selected and one
              // of its endpoints sits on this very dot, grabbing the dot must
              // release ONLY the selected connection from the shared dot and
              // move its endpoint, even when other connections share it.
              if (selectedConnectionId) {
                const conn = connections.find((c) => c.id === selectedConnectionId);
                if (conn) {
                  if (conn.sourcePointId === pointId) {
                    startConnectionEndpointEdit(event, conn.id, 'source');
                    return;
                  }
                  if (conn.targetPointId === pointId) {
                    startConnectionEndpointEdit(event, conn.id, 'target');
                    return;
                  }
                }
              }
              startConnectionFromPoint(event, pointId);
            }}
            onPointerEnter={() => {
              if (connectionDraft) setHoveredConnectionPointId(pointId);
            }}
            onPointerLeave={() => {
              if (connectionDraft && hoveredConnectionPointId === pointId) {
                setHoveredConnectionPointId(null);
              }
            }}
            aria-label="Connection point"
          />
        );
      })}
    </span>
  );

  useEffect(() => {
    if (!researchId || !token) return;

    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchResearch(token, researchId);
        if (cancelled) return;

        setResearchName(data.name || '');

        const canvasState = data.canvas_state || {};
        const apiNodes = Array.isArray(data.nodes) ? data.nodes : [];
        const apiConnections = Array.isArray(data.connections) ? data.connections : [];

        // Re-resolve ayah words for every node that has a valid address so the
        // canvas restores full ayah text, not just the address number.
        const restoredNodes = await Promise.all(
          apiNodes.map(async (n) => {
            const base = {
              id: n.client_id,
              x: n.x,
              y: n.y,
              address: n.address || '1:1',
              error: '',
              width: n.width || 0,
              height: n.height || 0,
              surahNumber: n.surah_number,
              ayahNumber: n.ayah_number,
              sortOrder: n.sort_order || 0,
              // Forward-compat seams (Phase 3+ owner-confirmation model).
              createdBy: n.created_by || null,
              suggestionStatus: n.suggestion_status || 'confirmed',
              words: [],
              type: RESEARCH_NODE_TYPES.PLACEHOLDER,
            };

            if (n.surah_number && n.ayah_number && n.address) {
              try {
                const result = await resolveAyahAddressToWords(n.address);
                if (result?.ok) {
                  return {
                    ...base,
                    type: RESEARCH_NODE_TYPES.READY,
                    words: result.words,
                    address: result.normalizedAddress,
                    surahNumber: result.surahNumber,
                    ayahNumber: result.ayahNumber,
                  };
                }
              } catch {
                // Fall through to placeholder; user can re-trigger via blur.
              }
            }

            return base;
          }),
        );
        if (cancelled) return;

        const restoredConnections = apiConnections.map((c) => ({
          id: c.client_id,
          direction: c.direction || 'uni',
          sourcePointId: c.source_point_id,
          targetPointId: c.target_point_id,
          description: c.description || '',
          sortOrder: c.sort_order || 0,
          // Forward-compat seams.
          createdBy: c.created_by || null,
          suggestionStatus: c.suggestion_status || 'confirmed',
        }));

        const initialSnapshot = {
          pan: canvasState.pan || { x: 0, y: 0 },
          scale: Number.isFinite(canvasState.scale) ? canvasState.scale : 1,
          nodes: restoredNodes,
          connections: restoredConnections,
          connectionDirection: canvasState.connectionDirection || 'uni',
        };

        applySnapshot(initialSnapshot);
        historyRef.current = [{ key: snapshotToKey(initialSnapshot), snapshot: initialSnapshot }];
        redoRef.current = [];
        syncHistoryFlags();
        hasHydratedRef.current = true;
      } catch {
        if (!cancelled) hasHydratedRef.current = true;
      }
    };

    load();

    return () => { cancelled = true; };
  }, [researchId, token]);

  // Auto-focus the address input of a newly dropped node so the user can type
  // the ayah address without needing to double-click into edit mode first.
  useEffect(() => {
    const pendingId = newDroppedNodeIdRef.current;
    if (!pendingId) return;
    const exists = nodes.some((n) => n.id === pendingId);
    if (!exists) return;
    newDroppedNodeIdRef.current = null;
    // Defer to next paint so the input is mounted in the DOM.
    const raf = requestAnimationFrame(() => {
      const input = document.querySelector(
        `.research-canvas__address-input[data-node-id="${pendingId}"]`,
      );
      if (input) {
        input.focus();
        input.select?.();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [nodes]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    // Phase 1 plan #19: undo/redo MUST persist to the backend so reload
    // and other devices reflect the restored state. Previously this
    // effect early-returned when applying history, which skipped the
    // save. Now we only skip the history mutation (so undo/redo do not
    // re-enter their own snapshots) but ALWAYS run the autosave below.
    const isApplyingHistory = isApplyingHistoryRef.current;
    if (isApplyingHistory) {
      isApplyingHistoryRef.current = false;
    }

    if (!isApplyingHistory) {
      const snapshot = {
        pan,
        scale,
        nodes,
        connections,
        connectionDirection,
      };
      const key = snapshotToKey(snapshot);
      const history = historyRef.current;
      const last = history[history.length - 1];
      if (!last || last.key !== key) {
        history.push({ key, snapshot });
        if (history.length > 80) history.shift();
        redoRef.current = [];
        syncHistoryFlags();
      }
    }

    if (researchId && token) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const payload = {
          canvas_state: { pan, scale, connectionDirection },
          nodes: nodes.map((n, i) => ({
            client_id: n.id,
            address: n.address || '',
            surah_number: n.surahNumber || null,
            ayah_number: n.ayahNumber || null,
            node_type: n.type || 'placeholder',
            x: n.x,
            y: n.y,
            width: n.width || 0,
            height: n.height || 0,
            sort_order: i,
            suggestion_status: n.suggestionStatus || 'confirmed',
          })),
          connections: connections.map((c, i) => ({
            client_id: c.id,
            source_point_id: c.sourcePointId,
            target_point_id: c.targetPointId,
            direction: c.direction || 'uni',
            description: c.description || '',
            sort_order: i,
            suggestion_status: c.suggestionStatus || 'confirmed',
          })),
        };
        saveResearch(token, researchId, payload).catch(() => {});
      }, 1500);
    }
  }, [pan, scale, nodes, connections, connectionDirection]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const cmdOrCtrl = event.metaKey || event.ctrlKey;
      if (!cmdOrCtrl) return;

      const key = event.key.toLowerCase();
      const redoKey = key === 'y' || (key === 'z' && event.shiftKey);
      const undoKey = key === 'z' && !event.shiftKey;
      if (!undoKey && !redoKey) return;

      event.preventDefault();

      if (undoKey) {
        performUndo();
        return;
      }

      performRedo();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setResearchState, nodes, pan, scale, connections, connectionDirection]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const viewportRect = viewport.getBoundingClientRect();
    const nextAnchors = {};
    const nextOwnerRects = {};

    connectionPointRefs.current.forEach((element, id) => {
      const rect = element.getBoundingClientRect();
      nextAnchors[id] = {
        x: (rect.left + rect.width / 2 - viewportRect.left - pan.x) / scale,
        y: (rect.top + rect.height / 2 - viewportRect.top - pan.y) / scale,
      };
    });

    selectableRefs.current.forEach((element, id) => {
      const rect = element.getBoundingClientRect();
      nextOwnerRects[id] = {
        left: (rect.left - viewportRect.left - pan.x) / scale,
        right: (rect.right - viewportRect.left - pan.x) / scale,
        top: (rect.top - viewportRect.top - pan.y) / scale,
        bottom: (rect.bottom - viewportRect.top - pan.y) / scale,
      };
    });

    setAnchors(nextAnchors);
    setOwnerRects(nextOwnerRects);
    // Anchors and owner rects are computed in CANVAS coordinates (we subtract
    // pan and divide by scale), so they are invariant under pan/zoom and only
    // need to recompute when nodes themselves change. Per Universal Principle
    // #12 (scale-first), pan/zoom must NOT trigger O(N) anchor recomputation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  useLayoutEffect(() => {
    const nextRects = {};

    selectionGroups.forEach((group) => {
      const cardElement = selectableRefs.current.get(`n:${group.nodeId}:group`);
      if (!cardElement) return;

      const cardRect = cardElement.getBoundingClientRect();
      const itemRects = group.itemIds
        .map((itemId) => selectableRefs.current.get(itemId)?.getBoundingClientRect())
        .filter(Boolean);

      if (!itemRects.length) return;

      const left = Math.min(...itemRects.map((rect) => rect.left)) - cardRect.left;
      const top = Math.min(...itemRects.map((rect) => rect.top)) - cardRect.top;
      const right = Math.max(...itemRects.map((rect) => rect.right)) - cardRect.left;
      const bottom = Math.max(...itemRects.map((rect) => rect.bottom)) - cardRect.top;

      nextRects[group.id] = {
        left,
        top,
        width: right - left,
        height: bottom - top,
      };
    });

    setSelectionGroupRects(nextRects);
  }, [selectionGroups, nodes, pan.x, pan.y, scale]);

  const marqueeRect = marquee
    ? {
        left: Math.min(marquee.startX, marquee.currentX),
        top: Math.min(marquee.startY, marquee.currentY),
        width: Math.abs(marquee.currentX - marquee.startX),
        height: Math.abs(marquee.currentY - marquee.startY),
      }
    : null;

  const onSelectPointerDownCapture = (event) => {
    // Phase 1 plan #11 (gestures): the marquee starts ONLY when selection
    // mode is active. Selection mode is entered by a double-click (desktop)
    // or double-tap (mobile) on empty canvas. A plain mouse-down on empty
    // canvas always pans — it never starts a marquee. This applies to both
    // pointer types.
    if (!selectionMode) return;
    if (connectionDraft || connectionEditDraft) return;
    if (event.target.closest('.research-canvas__connection-line, .research-canvas__connection-endpoint')) return;
    if (event.target.closest('.research-canvas__toolbar') || event.target.closest('.research-canvas__node')) return;

    clearSelectionState();

    setMarquee({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
    });
    event.preventDefault();
    event.stopPropagation();
  };

  // Phase 1 plan #11 + #12: marquee selection MUST NOT span multiple ayah
  // nodes. Drop the `:group` whole-ayah ids and any items not belonging to
  // the most-populated single ayah inside the marquee.
  const constrainSelectionToSingleAyah = (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const byNode = new Map();
    ids
      .filter((id) => typeof id === 'string' && !id.endsWith(':group'))
      .forEach((id) => {
        const nodeId = nodeIdFromSelectableId(id);
        if (!nodeId) return;
        if (!byNode.has(nodeId)) byNode.set(nodeId, []);
        byNode.get(nodeId).push(id);
      });
    if (byNode.size === 0) return [];
    let bestNodeId = null;
    let bestCount = -1;
    byNode.forEach((arr, nodeId) => {
      if (arr.length > bestCount) {
        bestCount = arr.length;
        bestNodeId = nodeId;
      }
    });
    return byNode.get(bestNodeId) || [];
  };

  const onSelectPointerMoveCapture = (event) => {
    if (connectionDraft) return;
    if (!marquee || event.pointerId !== marquee.pointerId) return;
    const nextMarquee = { ...marquee, currentX: event.clientX, currentY: event.clientY };
    setMarquee(nextMarquee);

    const selectionRect = {
      left: Math.min(nextMarquee.startX, nextMarquee.currentX),
      right: Math.max(nextMarquee.startX, nextMarquee.currentX),
      top: Math.min(nextMarquee.startY, nextMarquee.currentY),
      bottom: Math.max(nextMarquee.startY, nextMarquee.currentY),
    };
    setSelectionPreviewIds(constrainSelectionToSingleAyah(collectIntersectingSelectableIds(selectionRect)));
    event.preventDefault();
    event.stopPropagation();
  };

  const onSelectPointerEndCapture = (event) => {
    if (connectionDraft) return;
    if (!marquee || event.pointerId !== marquee.pointerId) return;
    const selectionRect = {
      left: Math.min(marquee.startX, marquee.currentX),
      right: Math.max(marquee.startX, marquee.currentX),
      top: Math.min(marquee.startY, marquee.currentY),
      bottom: Math.max(marquee.startY, marquee.currentY),
    };

    const nextSelected = constrainSelectionToSingleAyah(collectIntersectingSelectableIds(selectionRect));

    if (nextSelected.length) {
      const byNode = new Map();

      nextSelected
        .filter((id) => !id.endsWith(':group'))
        .forEach((id) => {
        const nodeId = nodeIdFromSelectableId(id);
        if (!nodeId) return;
        if (!byNode.has(nodeId)) {
          byNode.set(nodeId, { groupHit: false, items: new Set() });
        }

        const entry = byNode.get(nodeId);
        entry.items.add(id);
      });

      const normalizedSelection = [];
      const nextSelectionGroups = [];
      byNode.forEach((entry, nodeId) => {
        // Phase 1 plan #12: never auto-collapse a marquee that captured every
        // child of an ayah into a `:group` whole-ayah selection. Whole-ayah
        // selection is reserved for the meta/address element only. Treat all
        // marquee selections as element-level subset groups.
        if (entry.items.size > 1) {
          const itemIds = Array.from(entry.items).sort();
          nextSelectionGroups.push({
            id: buildSubsetGroupId(nodeId, itemIds),
            nodeId,
            itemIds,
          });
          normalizedSelection.push(buildSubsetGroupId(nodeId, itemIds));
          return;
        }

        if (entry.items.size === 1) {
          normalizedSelection.push(Array.from(entry.items)[0]);
          return;
        }
      });

      setSelectionGroups(nextSelectionGroups);
      setSelectedIds(Array.from(new Set(normalizedSelection)));
    } else {
      setSelectionGroups([]);
      setSelectedIds([]);
    }
    setSelectionPreviewIds([]);
    setMarquee(null);
    event.preventDefault();
    event.stopPropagation();
  };

  // ----- Phase 1: delete + contextual menu + group ops + double-tap connection arming -----

  // Selected node ids (canvas nodes), derived from selection state.
  const selectedNodeIds = useMemo(() => {
    const ids = new Set();
    selectedIds.forEach((sid) => {
      if (typeof sid !== 'string') return;
      if (sid.endsWith(':group')) {
        const m = sid.match(/^n:([^:]+):group$/);
        if (m) ids.add(m[1]);
      }
    });
    return Array.from(ids);
  }, [selectedIds]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const cancelArming = useCallback(() => {
    setArmedSourceOwnerId(null);
    lastTapRef.current = null;
  }, []);

  const performDeleteForMenu = useCallback(
    (menu) => {
      if (!menu) return;
      if (menu.kind === 'connection') {
        const target = new Set(menu.ids);
        setConnections((prev) => prev.filter((c) => !target.has(c.id)));
        setSelectedConnectionId((prev) => (prev && target.has(prev) ? null : prev));
        return;
      }
      if (menu.kind === 'node') {
        const targetNodes = new Set(menu.ids);
        deleteNodesByIds(Array.from(targetNodes));
        setConnections((prev) =>
          prev.filter((c) => {
            const sOwner = ownerIdFromPointId(c.sourcePointId);
            const tOwner = ownerIdFromPointId(c.targetPointId);
            const sNode = nodeIdFromSelectableId(sOwner);
            const tNode = nodeIdFromSelectableId(tOwner);
            return !(targetNodes.has(sNode) || targetNodes.has(tNode));
          }),
        );
        setSelectedIds((prev) => prev.filter((sid) => {
          const m = typeof sid === 'string' ? sid.match(/^n:([^:]+):/) : null;
          return !(m && targetNodes.has(m[1]));
        }));
        cancelArming();
      }
    },
    [deleteNodesByIds, cancelArming],
  );

  const buildDeleteMenuItem = useCallback(
    (menu) => ({
      id: 'delete',
      label: 'Delete',
      icon: '✕',
      // Phase 1 plan #18: route every Delete through the confirmation
      // dialog instead of mutating immediately.
      onSelect: () => setPendingDelete(menu),
    }),
    [],
  );

  const openContextMenuForNode = useCallback(
    (clientX, clientY, nodeId) => {
      const isInGroup = selectedNodeIds.includes(nodeId);
      const ids = isInGroup && selectedNodeIds.length > 1 ? selectedNodeIds : [nodeId];
      setContextMenu({ x: clientX, y: clientY, kind: 'node', ids });
    },
    [selectedNodeIds],
  );

  const openContextMenuForConnection = useCallback((clientX, clientY, connectionId) => {
    setContextMenu({ x: clientX, y: clientY, kind: 'connection', ids: [connectionId] });
  }, []);

  // Long-press detection (mobile) — same effect as right-click.
  const startLongPress = (event, kind, id) => {
    if (event.pointerType !== 'touch') return;
    cancelLongPress();
    const startX = event.clientX;
    const startY = event.clientY;
    const timer = setTimeout(() => {
      if (!longPressRef.current) return;
      if (kind === 'node') openContextMenuForNode(startX, startY, id);
      else if (kind === 'connection') openContextMenuForConnection(startX, startY, id);
      longPressRef.current = null;
    }, LONG_PRESS_MS);
    longPressRef.current = { timer, startX, startY, kind, id };
  };

  const moveLongPress = (event) => {
    if (!longPressRef.current) return;
    const dx = event.clientX - longPressRef.current.startX;
    const dy = event.clientY - longPressRef.current.startY;
    if (Math.hypot(dx, dy) > LONG_PRESS_TOLERANCE_PX) cancelLongPress();
  };

  const cancelLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current = null;
    }
  };

  // Mobile double-tap connection arming. Operates at the *element* level
  // (word / segment / meta / whole-ayah-group) — the unit of selection inside
  // an ayah node is the individual selectable element, per Phase 1 plan #12.
  const handleElementTap = (event, ownerId) => {
    if (event.pointerType !== 'touch') return false;
    if (!ownerId) return false;
    // Phase 1 plan #12: whole-ayah selection is exclusive to the meta/address
    // element. Tapping the ayah-card frame (`:group`) must NOT select the
    // whole ayah — ignore those taps so users only get whole-ayah selection
    // by tapping the address element at the end of the ayah.
    if (String(ownerId).endsWith(':group') && !String(ownerId).startsWith(SUBSET_GROUP_PREFIX)) return false;
    const now = Date.now();
    const last = lastTapRef.current;
    const isDoubleTap =
      last &&
      last.ownerId === ownerId &&
      now - last.t < DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) < DOUBLE_TAP_TOLERANCE_PX;

    if (!isDoubleTap) {
      lastTapRef.current = { ownerId, t: now, x: event.clientX, y: event.clientY };
      return false;
    }

    lastTapRef.current = null;

    if (!armedSourceOwnerId) {
      setArmedSourceOwnerId(ownerId);
      // Exclusive selection of just this element so the user sees the
      // selected/armed effect on the specific word / segment / meta they tapped.
      setSelectedIds([ownerId]);
      setSelectedConnectionId(null);
      return true;
    }
    if (armedSourceOwnerId === ownerId) {
      cancelArming();
      setSelectedIds([]);
      return true;
    }

    const sourcePointId = `${armedSourceOwnerId}:cp:${defaultSideForOwnerId(armedSourceOwnerId)}`;
    const targetPointId = `${ownerId}:cp:${defaultSideForOwnerId(ownerId)}`;
    setConnections((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        direction: connectionDirection,
        sourcePointId,
        targetPointId,
        description: '',
        suggestionStatus: 'confirmed',
        createdBy: null,
      },
    ]);
    cancelArming();
    setSelectedIds([]);
    return true;
  };

  // Empty-area tap — cancels arming or toggles group-select box.
  // Phase 1 plan #11: desktop double-click and mobile double-tap on empty
  // canvas both toggle selection mode (entry / exit). A single click/tap on
  // empty area while armed cancels arming. Plain mouse-down on empty area
  // does NOT start a marquee — it pans (handled by startPanDrag).
  const handleEmptyAreaTap = (event) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'mouse') return;
    if (armedSourceOwnerId) {
      cancelArming();
      setSelectedIds([]);
      return;
    }
    const now = Date.now();
    const last = lastEmptyTapRef.current;
    const isDoubleTap =
      last &&
      now - last.t < DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) < DOUBLE_TAP_TOLERANCE_PX;
    lastEmptyTapRef.current = isDoubleTap ? null : { t: now, x: event.clientX, y: event.clientY };
    if (isDoubleTap) {
      // Toggle selection mode (group-select entry/exit) on both desktop and mobile.
      setSelectionMode((prev) => !prev);
    }
  };

  // Esc cancels arming, closes the contextual menu, AND exits selection mode
  // (Phase 1 plan #11: selection mode must be exitable via Esc because it
  // disables pan + node-drag and would otherwise leave the user stuck).
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        cancelArming();
        closeContextMenu();
        setSelectionMode(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancelArming, closeContextMenu]);

  // Wrap node pointer-down to enable group-drag when the node is part of a group selection.
  const handleNodePointerDown = (event, nodeId, nodeType) => {
    cancelLongPress();
    // Phase 1 plan #11: long-press on a word or segment must NOT open the
    // whole-ayah contextual menu. Suppress the long-press timer when the
    // pointer-down target is inside a word/segment span.
    const blockTarget = event.target.closest(
      '.research-canvas__word-block, .research-canvas__segment-item',
    );
    if (!blockTarget) {
      startLongPress(event, 'node', nodeId);
    }

    if (selectedNodeIds.length > 1 && selectedNodeIds.includes(nodeId)) {
      onNodePointerDown(event, nodeId, nodeType, selectedNodeIds);
      return;
    }
    onNodePointerDown(event, nodeId, nodeType);
  };

  // Phase 1 plan #18: human-readable label for any selectable owner id, used
  // by the delete confirmation dialog to describe the impact.
  const labelForOwnerId = useCallback(
    (ownerId) => {
      if (!ownerId || typeof ownerId !== 'string') return 'unknown';
      if (ownerId.startsWith(SUBSET_GROUP_PREFIX)) {
        const rest = ownerId.slice(SUBSET_GROUP_PREFIX.length);
        const nodeId = rest.split(':')[0];
        const node = nodes.find((n) => n.id === nodeId);
        const addr = node ? `${node.surahNumber}:${node.ayahNumber}` : 'ayah';
        return `selection in ${addr}`;
      }
      const nodeId = nodeIdFromSelectableId(ownerId);
      const node = nodes.find((n) => n.id === nodeId);
      const addr = node ? `${node.surahNumber || node.address}:${node.ayahNumber || ''}`.replace(/:$/, '') : 'ayah';
      const rest = ownerId.split(':').slice(2).join(':');
      if (!rest || rest === 'group' || rest === 'meta') return `ayah ${addr}`;
      if (rest.startsWith('w:')) {
        const i = parseInt(rest.slice(2), 10);
        const text = node?.words?.[i]?.text || `word ${i + 1}`;
        return `${addr} · ${text}`;
      }
      if (rest.startsWith('s:')) {
        const [, wi, si] = rest.split(':');
        const text = node?.words?.[parseInt(wi, 10)]?.segments?.[parseInt(si, 10)] || `seg ${si}`;
        return `${addr} · ${text}`;
      }
      return `ayah ${addr}`;
    },
    [nodes],
  );

  // Phase 1 plan #18: derive the dialog props (summary + impact list) from
  // the pendingDelete menu so the user sees exactly what will change before
  // confirming.
  const deleteConfirmProps = useMemo(() => {
    if (!pendingDelete) return null;
    if (pendingDelete.kind === 'connection') {
      const connId = pendingDelete.ids[0];
      const conn = connections.find((c) => c.id === connId);
      const fromLabel = conn ? labelForOwnerId(ownerIdFromPointId(conn.sourcePointId)) : 'source';
      const toLabel = conn ? labelForOwnerId(ownerIdFromPointId(conn.targetPointId)) : 'target';
      return {
        summary: 'Delete this connection?',
        impactItems: conn ? [{ id: conn.id, from: fromLabel, to: toLabel }] : [],
      };
    }
    if (pendingDelete.kind === 'node') {
      const targetNodes = new Set(pendingDelete.ids);
      const summary =
        targetNodes.size === 1
          ? `Delete ayah ${(() => {
              const n = nodes.find((x) => x.id === [...targetNodes][0]);
              return n ? `${n.surahNumber}:${n.ayahNumber}` : '';
            })()}?`
          : `Delete ${targetNodes.size} ayahs?`;
      const impactItems = connections
        .filter((c) => {
          const sNode = nodeIdFromSelectableId(ownerIdFromPointId(c.sourcePointId));
          const tNode = nodeIdFromSelectableId(ownerIdFromPointId(c.targetPointId));
          return targetNodes.has(sNode) || targetNodes.has(tNode);
        })
        .map((c) => ({
          id: c.id,
          from: labelForOwnerId(ownerIdFromPointId(c.sourcePointId)),
          to: labelForOwnerId(ownerIdFromPointId(c.targetPointId)),
        }));
      return { summary, impactItems };
    }
    return null;
  }, [pendingDelete, connections, nodes, labelForOwnerId]);

  const onConfirmDelete = useCallback(() => {
    if (pendingDelete) performDeleteForMenu(pendingDelete);
    setPendingDelete(null);
  }, [pendingDelete, performDeleteForMenu]);

  const onCancelDelete = useCallback(() => setPendingDelete(null), []);

  return (
    <div className={`research-canvas ${connectionDraft || connectionEditDraft ? 'is-connecting' : ''} ${armedSourceOwnerId ? 'is-arming' : ''} ${selectionMode ? 'is-selection-mode' : ''}`} style={canvasStyles}>
      <div className="research-canvas__toolbar">
        <button
          type="button"
          className="research-canvas__tool-button research-canvas__tool-button--icon"
          onClick={onBackToHub}
          title={researchName ? `Back to research list — ${researchName}` : 'Back to research list'}
          aria-label="Back to research list"
        >
          ←
        </button>

        <button
          type="button"
          className="research-canvas__tool-button research-canvas__tool-button--icon"
          onClick={performUndo}
          disabled={!canUndo}
          title="Undo (Ctrl/Cmd+Z)"
          aria-label="Undo"
        >
          ↶
        </button>

        <button
          type="button"
          className="research-canvas__tool-button research-canvas__tool-button--icon"
          onClick={performRedo}
          disabled={!canRedo}
          title="Redo (Ctrl/Cmd+Shift+Z)"
          aria-label="Redo"
        >
          ↷
        </button>

        {isMobileLike ? (
          <button
            type="button"
            className={`research-canvas__seed ${tapDropMode ? 'is-active' : ''}`}
            onClick={() => setTapDropMode((prev) => !prev)}
            title="Tap and then choose location"
            aria-label="Tap-to-place ayah input"
          >
            1:1
          </button>
        ) : (
          <div className="research-canvas__seed" draggable onDragStart={onTemplateDragStart}>
            1:1
          </div>
        )}
      </div>

      {selectionMode ? (
        <button
          type="button"
          className="research-canvas__selection-mode-badge"
          onClick={() => setSelectionMode(false)}
          title="Selection mode — double-click empty canvas or press Esc to exit"
          aria-label="Exit selection mode"
        >
          ▣
        </button>
      ) : null}

      <div className="research-canvas__zoom-controls">
        <button
          type="button"
          className="research-canvas__zoom-button"
          onClick={() => zoomBy(1 / 1.15)}
          aria-label="Zoom out"
          title="Zoom out"
        >
          -
        </button>

        <span className="research-canvas__zoom-readout">{Math.round(scale * 100)}%</span>

        <button
          type="button"
          className="research-canvas__zoom-button"
          onClick={() => zoomBy(1.15)}
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
      </div>

      <div
        ref={viewportRef}
        className="research-canvas__viewport"
        onWheel={onViewportWheel}
        onPointerDownCapture={(event) => {
          onViewportPointerDownCapture(event);
          onSelectPointerDownCapture(event);

          const clickedOnEmptySpace =
            !event.target.closest('.research-canvas__toolbar') &&
            !event.target.closest('.research-canvas__node') &&
            !event.target.closest('.research-canvas__connection-line') &&
            !event.target.closest('.research-canvas__connection-endpoint');
          if (clickedOnEmptySpace && (selectedIds.length || selectedConnectionId)) {
            setSelectedIds([]);
            setSelectedConnectionId(null);
          }

          if (!isMobileLike || !tapDropMode) return;
          if (event.target.closest('.research-canvas__toolbar') || event.target.closest('.research-canvas__node')) return;
          const placedId = placeNodeAtClientPoint(event.clientX, event.clientY);
          if (placedId) {
            newDroppedNodeIdRef.current = placedId;
            setTapDropMode(false);
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerMoveCapture={(event) => {
          const owner = event.target?.closest?.('.research-canvas__connectable')?.dataset?.ownerId || null;
          if (!connectionDraft && !connectionEditDraft) {
            setHoveredOwnerId(owner);
          }

          onViewportPointerMoveCapture(event);
          onConnectionPointerMoveCapture(event);
          onSelectPointerMoveCapture(event);
        }}
        onPointerUpCapture={(event) => {
          onViewportPointerEndCapture(event);
          onConnectionPointerEndCapture(event);
          onSelectPointerEndCapture(event);
          if (!connectionDraft && !connectionEditDraft) {
            setHoveredOwnerId(null);
          }
          // Empty-area tap (cancel arming / toggle group-select on mobile)
          const onEmpty =
            !event.target.closest('.research-canvas__toolbar') &&
            !event.target.closest('.research-canvas__node') &&
            !event.target.closest('.research-canvas__connection-line') &&
            !event.target.closest('.research-canvas__connection-endpoint');
          if (onEmpty) handleEmptyAreaTap(event);
          cancelLongPress();
        }}
        onPointerCancelCapture={(event) => {
          onViewportPointerEndCapture(event);
          onConnectionPointerEndCapture(event);
          onSelectPointerEndCapture(event);
          setHoveredOwnerId(null);
          cancelLongPress();
        }}
        onPointerDown={startPanDrag}
        onPointerMove={(event) => {
          movePanDrag(event);
          moveLongPress(event);
        }}
        onPointerUp={(event) => {
          stopPanDrag(event);
          cancelLongPress();
        }}
        onPointerCancel={(event) => {
          stopPanDrag(event);
          cancelLongPress();
        }}
        onContextMenu={(event) => {
          // Suppress browser default context menu on viewport empty area;
          // only nodes/connections open our menu.
          if (
            !event.target.closest('.research-canvas__node') &&
            !event.target.closest('.research-canvas__connection-line')
          ) {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          const placedId = onDropToSurface(event);
          if (placedId) newDroppedNodeIdRef.current = placedId;
        }}
        onDragOver={onAllowDrop}
      >
        {marqueeRect && (
          <div
            className="research-canvas__marquee"
            style={{
              left: `${marqueeRect.left}px`,
              top: `${marqueeRect.top}px`,
              width: `${marqueeRect.width}px`,
              height: `${marqueeRect.height}px`,
            }}
          />
        )}

        <div
          className="research-canvas__surface"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        >
          <svg className="research-canvas__connections" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="research-canvas-arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path className="research-canvas__arrowhead" d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {(() => {
              // Viewport culling per Universal Principle #12: only render
              // connections whose bounding box intersects the visible
              // viewport. Off-screen connections are skipped entirely.
              const viewport = viewportRef.current;
              const vpRect = viewport ? viewport.getBoundingClientRect() : null;
              const vpBox = vpRect
                ? {
                    left: -pan.x / scale,
                    top: -pan.y / scale,
                    right: (-pan.x + vpRect.width) / scale,
                    bottom: (-pan.y + vpRect.height) / scale,
                  }
                : null;
              const intersects = (poly) => {
                if (!vpBox || !poly || poly.length < 2) return true;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (let i = 0; i < poly.length; i += 1) {
                  const p = poly[i];
                  if (p.x < minX) minX = p.x;
                  if (p.y < minY) minY = p.y;
                  if (p.x > maxX) maxX = p.x;
                  if (p.y > maxY) maxY = p.y;
                }
                return !(maxX < vpBox.left || minX > vpBox.right || maxY < vpBox.top || minY > vpBox.bottom);
              };
              return connections.map((connection) => {
              const routedPolyline = connectionPaths[connection.id];
              if (!intersects(routedPolyline)) return null;
              const sourcePoint =
                (routedPolyline && routedPolyline[0]) || anchors[connection.sourcePointId];
              const targetPoint =
                (routedPolyline && routedPolyline[routedPolyline.length - 1]) ||
                anchors[connection.targetPointId];
              const pathData = connectionPathData(connection.sourcePointId, connection.targetPointId, connection.id);
              if (!pathData) return null;

              const isSelectedConnection = selectedConnectionId === connection.id;

              return (
                <g key={connection.id}>
                  <path
                    d={pathData}
                    className={`research-canvas__connection-line ${isSelectedConnection ? 'is-selected' : ''}`}
                    markerEnd="url(#research-canvas-arrow-end)"
                    markerStart={connection.direction === 'bi' ? 'url(#research-canvas-arrow-end)' : undefined}
                    onPointerEnter={() => setHoveredConnectionId(connection.id)}
                    onPointerLeave={() =>
                      setHoveredConnectionId((prev) => (prev === connection.id ? null : prev))
                    }
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedConnectionId(connection.id);
                      startLongPress(event, 'connection', connection.id);
                    }}
                    onPointerUp={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedConnectionId(connection.id);
                      openContextMenuForConnection(event.clientX, event.clientY, connection.id);
                    }}
                  />

                  {isSelectedConnection && sourcePoint ? (
                    <circle
                      className="research-canvas__connection-endpoint"
                      cx={sourcePoint.x}
                      cy={sourcePoint.y}
                      r="5"
                      onPointerDown={(event) => startConnectionEndpointEdit(event, connection.id, 'source')}
                    />
                  ) : null}

                  {isSelectedConnection && targetPoint ? (
                    <circle
                      className="research-canvas__connection-endpoint"
                      cx={targetPoint.x}
                      cy={targetPoint.y}
                      r="5"
                      onPointerDown={(event) => startConnectionEndpointEdit(event, connection.id, 'target')}
                    />
                  ) : null}
                </g>
              );
            });
            })()}

            {connectionEditDraft ? (
              (() => {
                const connection = connections.find((item) => item.id === connectionEditDraft.connectionId);
                if (!connection) return null;

                const source =
                  connectionEditDraft.endpoint === 'source'
                    ? { x: connectionEditDraft.x, y: connectionEditDraft.y }
                    : anchors[connection.sourcePointId];
                const target =
                  connectionEditDraft.endpoint === 'target'
                    ? { x: connectionEditDraft.x, y: connectionEditDraft.y }
                    : anchors[connection.targetPointId];
                if (!source || !target) return null;

                const draftPath = `M ${source.x} ${source.y} L ${target.x} ${target.y}`;

                return (
                  <path
                    d={draftPath}
                    className="research-canvas__connection-line is-draft"
                    markerEnd="url(#research-canvas-arrow-end)"
                    markerStart={connection.direction === 'bi' ? 'url(#research-canvas-arrow-end)' : undefined}
                  />
                );
              })()
            ) : null}

            {connectionDraft && anchors[connectionDraft.sourcePointId] ? (
              (() => {
                const draftTargetId = hoveredConnectionPointId || '__draft-target__';
                const draftAnchors = {
                  ...anchors,
                  '__draft-target__': { x: connectionDraft.x, y: connectionDraft.y },
                };
                const source = draftAnchors[connectionDraft.sourcePointId];
                const target = draftAnchors[draftTargetId];
                if (!source || !target) return null;

                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const distance = Math.hypot(dx, dy) || 1;
                const tangentX = dx / distance;
                const tangentY = dy / distance;
                const normalX = -tangentY;
                const normalY = tangentX;
                const offset = Math.min(90, Math.max(16, distance * 0.2));
                const pull = Math.min(120, Math.max(26, distance * 0.34));

                const c1 = {
                  x: source.x + tangentX * pull + normalX * offset,
                  y: source.y + tangentY * pull + normalY * offset,
                };
                const c2 = {
                  x: target.x - tangentX * pull + normalX * offset,
                  y: target.y - tangentY * pull + normalY * offset,
                };
                const draftPath = `M ${source.x} ${source.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${target.x} ${target.y}`;

                return (
                  <path
                    d={draftPath}
                    className="research-canvas__connection-line is-draft"
                    markerEnd="url(#research-canvas-arrow-end)"
                  />
                );
              })()
            ) : null}

            {armedSourceOwnerId
              ? (() => {
                  // Visible arming preview per Phase 1 plan #14: while a source
                  // element is armed (mobile double-tap flow), draw an arrow
                  // outward from its right-side connection point so the user
                  // can see that connection-creation is in progress before
                  // the target is tapped.
                  const sourcePointId = `${armedSourceOwnerId}:cp:right`;
                  const source = anchors[sourcePointId];
                  if (!source) return null;
                  const ownerRect = ownerRects[armedSourceOwnerId];
                  const reach = ownerRect ? Math.max(60, ownerRect.right - ownerRect.left) : 80;
                  const target = { x: source.x + reach, y: source.y };
                  const draftPath = `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
                  return (
                    <path
                      d={draftPath}
                      className="research-canvas__connection-line is-draft is-arming-preview"
                      markerEnd="url(#research-canvas-arrow-end)"
                    />
                  );
                })()
              : null}
          </svg>

          {nodes.map((node) => (
            <div
              key={node.id}
              className={`research-canvas__node research-canvas__node--${node.type}`}
              style={{ transform: `translate3d(${node.x}px, ${node.y}px, 0)` }}
              onPointerDown={(event) => handleNodePointerDown(event, node.id, node.type)}
              onPointerUp={(event) => {
                cancelLongPress();
                // Resolve the most-specific selectable owner under the pointer
                // so element-level (word / segment / meta) double-tap arming works.
                const ownerEl = event.target.closest('[data-owner-id]');
                const ownerId = ownerEl?.dataset?.ownerId || `n:${node.id}:group`;
                handleElementTap(event, ownerId);
              }}
              onPointerCancel={cancelLongPress}
              onContextMenu={(event) => {
                if (event.target.closest('input, textarea')) return;
                // Phase 1 plan #11: right-click on a word or segment must NOT
                // open any contextual menu (no per-word delete, and no
                // whole-ayah delete either). The whole-ayah delete menu is
                // shown only on empty area inside the ayah-card frame or
                // exactly on the ayah-address (meta) element.
                if (event.target.closest('.research-canvas__word-block, .research-canvas__segment-item')) {
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                openContextMenuForNode(event.clientX, event.clientY, node.id);
              }}
            >
              {(node.type === RESEARCH_NODE_TYPES.PLACEHOLDER || node.type === RESEARCH_NODE_TYPES.ERROR) && (
                <div className="research-canvas__address-box">
                  <input
                    value={node.address}
                    onChange={(event) => updateNode(node.id, { address: event.target.value })}
                    onKeyDown={(event) => onPlaceholderKeyDown(event, node.id)}
                    onFocus={() => onPlaceholderFocus(node.id)}
                    onBlur={() => onPlaceholderBlur(node.id)}
                    className="research-canvas__address-input"
                    data-node-id={node.id}
                  />
                  {node.error ? <div className="research-canvas__error">{node.error}</div> : null}
                </div>
              )}

              {node.type === RESEARCH_NODE_TYPES.LOADING && <div className="research-canvas__loading">Loading...</div>}

              {node.type === RESEARCH_NODE_TYPES.READY && (
                (() => {
                  const groupOwnerId = `n:${node.id}:group`;
                  const groupSelected = selectedIds.includes(groupOwnerId);
                  const nodeSelectionGroups = selectionGroups.filter((group) => group.nodeId === node.id);
                  const activeSourcePointId =
                    connectionDraft?.sourcePointId || connectionEditDraft?.movingPointId || null;
                  const sourceOwnerId = activeSourcePointId ? ownerIdFromPointId(activeSourcePointId) : null;
                  const targetOwnerId = hoveredConnectionPointId ? ownerIdFromPointId(hoveredConnectionPointId) : null;

                  const connectableStateClass = (ownerId, directlySelected) => {
                    const classes = [];

                    if (directlySelected) classes.push('is-selected');
                    if (!directlySelected && groupSelected && ownerId !== groupOwnerId) {
                      classes.push('is-group-selected');
                    }
                    if (hoveredOwnerId === ownerId) classes.push('is-hover-owner');
                    if (sourceOwnerId === ownerId) classes.push('is-connection-source');
                    if (targetOwnerId === ownerId) classes.push('is-connection-target');
                    if (armedSourceOwnerId === ownerId) classes.push('is-armed-source');
                    // Phase 1 plan #13: endpoint emphasis when this element is
                    // an endpoint of the currently hovered or selected
                    // connection.
                    if (emphasizedOwnerIds.has(ownerId)) classes.push('is-endpoint-emphasis');

                    return classes.join(' ');
                  };

                  // Phase 1 plan #13: when the connection's whole-ayah
                  // endpoint is the meta/address of THIS ayah, the entire
                  // ayah-card frame becomes more visible.
                  const wholeAyahEmphasis = emphasizedOwnerIds.has(`n:${node.id}:meta`);

                  const previewSelected = (itemId) =>
                    selectionPreviewIds.includes(itemId) &&
                    !nodeSelectionGroups.some((group) => group.itemIds.includes(itemId));

                  return (
                    <div
                  ref={setSelectableRef(`n:${node.id}:group`)}
                  className={`research-canvas__ayah-card ${node.width ? 'is-resized' : ''} ${wholeAyahEmphasis ? 'is-whole-ayah-emphasis' : ''}`}
                  style={{
                    width: node.width ? `${node.width}px` : undefined,
                    height: node.height ? `${node.height}px` : undefined,
                  }}
                  onClick={(event) => {
                    // Phase 1 plan #12: clicking the ayah-card frame must
                    // not select the whole ayah. Whole-ayah selection is
                    // reserved exclusively for the meta/address element.
                    event.stopPropagation();
                  }}
                >
                  <button
                    type="button"
                    className="research-canvas__resize-handle research-canvas__resize-handle--nw"
                    onPointerDown={(event) => onResizeHandlePointerDown(event, node.id, 'nw')}
                    aria-label="Resize from top-left"
                  />
                  <button
                    type="button"
                    className="research-canvas__resize-handle research-canvas__resize-handle--ne"
                    onPointerDown={(event) => onResizeHandlePointerDown(event, node.id, 'ne')}
                    aria-label="Resize from top-right"
                  />
                  <button
                    type="button"
                    className="research-canvas__resize-handle research-canvas__resize-handle--sw"
                    onPointerDown={(event) => onResizeHandlePointerDown(event, node.id, 'sw')}
                    aria-label="Resize from bottom-left"
                  />
                  <button
                    type="button"
                    className="research-canvas__resize-handle research-canvas__resize-handle--se"
                    onPointerDown={(event) => onResizeHandlePointerDown(event, node.id, 'se')}
                    aria-label="Resize from bottom-right"
                  />
                  <div className="research-canvas__ayah-content">
                    {nodeSelectionGroups.map((group) => {
                      const rect = selectionGroupRects[group.id];
                      if (!rect) return null;

                      return (
                        <div
                          key={group.id}
                          ref={setSelectableRef(group.id)}
                          className={`research-canvas__selection-group research-canvas__selectable research-canvas__connectable ${connectableStateClass(
                            group.id,
                            selectedIds.includes(group.id),
                          )}`}
                          data-owner-id={group.id}
                          style={{
                            left: `${rect.left}px`,
                            top: `${rect.top}px`,
                            width: `${rect.width}px`,
                            height: `${rect.height}px`,
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!selectionMode) return;
                            toggleSelected(group.id);
                          }}
                        >
                          {renderConnectionPoints(group.id)}
                        </div>
                      );
                    })}

                    {node.words.map((word, index) => (
                      (() => {
                        const wordOwnerId = `n:${node.id}:w:${index}`;
                        const wordSelected = selectedIds.includes(wordOwnerId);
                        const wordInSubsetGroup = nodeSelectionGroups.some((group) => group.itemIds.includes(wordOwnerId));
                        return (
                      <span
                        key={`${node.id}-${index}`}
                        ref={setSelectableRef(wordOwnerId)}
                        className={`research-canvas__word-block research-canvas__selectable research-canvas__connectable ${connectableStateClass(wordOwnerId, wordSelected)} ${previewSelected(wordOwnerId) ? 'is-preview-selected' : ''} ${wordInSubsetGroup ? 'is-subset-member' : ''}`}
                        data-owner-id={wordOwnerId}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!selectionMode) return;
                          toggleSelected(wordOwnerId);
                        }}
                        onContextMenu={(event) => {
                          // Phase 1 plan #11: words must NOT open any
                          // contextual menu (neither per-word nor
                          // whole-ayah). Suppress and do not bubble.
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                      >
                        {renderConnectionPoints(wordOwnerId)}
                        <span className="research-canvas__word-text">{word.text}</span>
                        <span className="research-canvas__segments">
                          {word.segments.length ? (
                            word.segments.map((segment, segmentIndex) => (
                              (() => {
                                const segmentOwnerId = `n:${node.id}:s:${index}:${segmentIndex}`;
                                const segmentSelected = selectedIds.includes(segmentOwnerId);
                                const segmentInSubsetGroup = nodeSelectionGroups.some((group) => group.itemIds.includes(segmentOwnerId));
                                return (
                              <span
                                key={`${node.id}-${index}-${segmentIndex}`}
                                ref={setSelectableRef(segmentOwnerId)}
                                className={`research-canvas__segment-item research-canvas__selectable research-canvas__connectable ${connectableStateClass(segmentOwnerId, segmentSelected)} ${previewSelected(segmentOwnerId) ? 'is-preview-selected' : ''} ${segmentInSubsetGroup ? 'is-subset-member' : ''}`}
                                data-owner-id={segmentOwnerId}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!selectionMode) return;
                                  toggleSelected(segmentOwnerId);
                                }}
                                onContextMenu={(event) => {
                                  // Phase 1 plan #11: sub-words/segments
                                  // must NOT open any contextual menu.
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                              >
                                {renderConnectionPoints(segmentOwnerId)}
                                {segment}
                              </span>
                                );
                              })()
                            ))
                          ) : (
                            <span className="research-canvas__segment-item">---</span>
                          )}
                        </span>
                      </span>
                        );
                      })()
                    ))}
                    {(() => {
                      const metaOwnerId = `n:${node.id}:meta`;
                      const metaSelected = selectedIds.includes(metaOwnerId);
                      const metaInSubsetGroup = nodeSelectionGroups.some((group) => group.itemIds.includes(metaOwnerId));
                      return (
                    <span
                      ref={setSelectableRef(metaOwnerId)}
                      className={`research-canvas__meta-trail research-canvas__selectable research-canvas__connectable ${connectableStateClass(metaOwnerId, metaSelected)} ${previewSelected(metaOwnerId) ? 'is-preview-selected' : ''} ${metaInSubsetGroup ? 'is-subset-member' : ''}`}
                      data-owner-id={metaOwnerId}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!selectionMode) return;
                        toggleSelected(metaOwnerId);
                      }}
                    >
                      {renderConnectionPoints(metaOwnerId)}
                      <span className="research-canvas__address-label">{node.address}</span>
                      <span className="research-canvas__surah-label">{surahs?.[node.surahNumber]?.[0] || ''}</span>
                    </span>
                      );
                    })()}
                  </div>
                </div>
                  );
                })()
              )}
            </div>
          ))}
        </div>
      </div>
      {contextMenu ? (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[buildDeleteMenuItem(contextMenu)]}
          onClose={closeContextMenu}
        />
      ) : null}
      {pendingDelete && deleteConfirmProps ? (
        <DeleteConfirmDialog
          summary={deleteConfirmProps.summary}
          impactItems={deleteConfirmProps.impactItems}
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      ) : null}
    </div>
  );
};

export default ResearchCanvas;
