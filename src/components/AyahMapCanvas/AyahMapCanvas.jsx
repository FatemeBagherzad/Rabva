import { MAP_NODE_TYPES, useAyahMapCanvas } from '../../hooks/useAyahMapCanvas';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './AyahMapCanvas.scss';

const CONNECTION_SIDES = ['top', 'right', 'bottom', 'left'];
const MAP_STATE_COOKIE_KEY = 'rabva_map_state';
const MAP_STATE_STORAGE_KEY = 'rabva_map_state_v1';
const SUBSET_GROUP_PREFIX = 'sg:';
const connectionPointId = (ownerId, side) => `${ownerId}:cp:${side}`;
const ownerIdFromPointId = (pointId) => pointId.split(':cp:')[0];
const nodeIdFromSelectableId = (id) => {
  const match = id.match(/^n:([^:]+):/);
  return match ? match[1] : null;
};

const pointInRect = (point, rect) =>
  point.x >= rect.left &&
  point.x <= rect.right &&
  point.y >= rect.top &&
  point.y <= rect.bottom;

const pointNearRect = (point, rect, padding) =>
  point.x >= rect.left - padding &&
  point.x <= rect.right + padding &&
  point.y >= rect.top - padding &&
  point.y <= rect.bottom + padding;

const linePointAt = (p0, p1, t) => ({
  x: p0.x + (p1.x - p0.x) * t,
  y: p0.y + (p1.y - p0.y) * t,
});

const buildSubsetGroupId = (nodeId, itemIds) =>
  `${SUBSET_GROUP_PREFIX}${nodeId}:${itemIds.join('|')}`;

const getCookieValue = (name) => {
  if (typeof document === 'undefined') return null;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapedName}=([^;]*)`),
  );
  return match ? match[1] : null;
};

const setCookieValue = (name, value) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 45}; SameSite=Lax`;
};

const snapshotToKey = (snapshot) =>
  JSON.stringify({
    pan: snapshot.pan,
    scale: snapshot.scale,
    nodes: snapshot.nodes,
    connections: snapshot.connections,
    connectionDirection: snapshot.connectionDirection,
  });

const cubicPointAt = (p0, c1, c2, p3, t) => {
  const oneMinusT = 1 - t;
  const x =
    oneMinusT * oneMinusT * oneMinusT * p0.x +
    3 * oneMinusT * oneMinusT * t * c1.x +
    3 * oneMinusT * t * t * c2.x +
    t * t * t * p3.x;
  const y =
    oneMinusT * oneMinusT * oneMinusT * p0.y +
    3 * oneMinusT * oneMinusT * t * c1.y +
    3 * oneMinusT * t * t * c2.y +
    t * t * t * p3.y;

  return { x, y };
};

const AyahMapCanvas = ({ preferences, surahs }) => {
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
  const [connectionEditDraft, setConnectionEditDraft] = useState(null);
  const [anchors, setAnchors] = useState({});
  const [ownerRects, setOwnerRects] = useState({});
  const [connectionDraft, setConnectionDraft] = useState(null);
  const [hoveredConnectionPointId, setHoveredConnectionPointId] =
    useState(null);
  const [hoveredOwnerId, setHoveredOwnerId] = useState(null);
  const [marquee, setMarquee] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const hasHydratedRef = useRef(false);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const isApplyingHistoryRef = useRef(false);

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
    setMapState,
  } = useAyahMapCanvas(preferences, { selectionMode });
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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
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
    setMapState({
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

    const movingPointId =
      endpoint === 'source'
        ? connection.sourcePointId
        : connection.targetPointId;
    const fixedPointId =
      endpoint === 'source'
        ? connection.targetPointId
        : connection.sourcePointId;
    const movingAnchor =
      anchors[movingPointId] ||
      clientToCanvasPoint(event.clientX, event.clientY);
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

  const connectionPathData = (sourcePointId, targetPointId) => {
    const source = anchors[sourcePointId];
    const target = anchors[targetPointId];
    if (!source || !target) return null;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.hypot(dx, dy) || 1;
    const tangentX = dx / distance;
    const tangentY = dy / distance;
    const normalX = -tangentY;
    const normalY = tangentX;
    const baseOffset = Math.min(140, Math.max(22, distance * 0.26));
    const pull = Math.min(150, Math.max(30, distance * 0.36));

    const sourceOwner = ownerIdFromPointId(sourcePointId);
    const targetOwner = ownerIdFromPointId(targetPointId);

    const obstacleScoreForSampler = (sampler) => {
      const nearPadding = Math.min(26, Math.max(12, distance * 0.08));
      const score = Object.entries(ownerRects).reduce(
        (acc, [ownerId, rect]) => {
          if (ownerId === sourceOwner || ownerId === targetOwner) return acc;

          for (let t = 0.15; t < 0.95; t += 0.1) {
            const point = sampler(t);
            if (pointInRect(point, rect)) {
              acc.hitCount += 1;
              break;
            }

            if (pointNearRect(point, rect, nearPadding)) {
              acc.nearCount += 1;
            }
          }

          return acc;
        },
        { hitCount: 0, nearCount: 0 },
      );

      return {
        ...score,
        combined: score.hitCount * 100 + score.nearCount,
      };
    };

    const straightScore = obstacleScoreForSampler((t) =>
      linePointAt(source, target, t),
    );
    if (straightScore.hitCount === 0 && straightScore.nearCount <= 2) {
      return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
    }

    const evaluateCurve = (sign, multiplier) => {
      const offset = baseOffset * multiplier * sign;
      const c1 = {
        x: source.x + tangentX * pull + normalX * offset,
        y: source.y + tangentY * pull + normalY * offset,
      };
      const c2 = {
        x: target.x - tangentX * pull + normalX * offset,
        y: target.y - tangentY * pull + normalY * offset,
      };

      const { hitCount, nearCount, combined } = obstacleScoreForSampler((t) =>
        cubicPointAt(source, c1, c2, target, t),
      );

      return {
        c1,
        c2,
        score: combined,
        hitCount,
        nearCount,
      };
    };

    const candidates = [];
    [1, -1].forEach((sign) => {
      [1, 1.4, 1.9, 2.5].forEach((multiplier) => {
        candidates.push(evaluateCurve(sign, multiplier));
      });
    });

    const chosen = candidates.sort(
      (a, b) => a.score - b.score || a.hitCount - b.hitCount,
    )[0];

    return `M ${source.x} ${source.y} C ${chosen.c1.x} ${chosen.c1.y}, ${chosen.c2.x} ${chosen.c2.y}, ${target.x} ${target.y}`;
  };

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

    const sourceAnchor =
      anchors[sourcePointId] ||
      clientToCanvasPoint(event.clientX, event.clientY);
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
    if (
      connectionEditDraft &&
      event.pointerId === connectionEditDraft.pointerId
    ) {
      const nextPoint = clientToCanvasPoint(event.clientX, event.clientY);
      if (!nextPoint) return;

      const nearestPointId = findNearestConnectionPointId(
        nextPoint,
        connectionEditDraft.fixedPointId,
      );
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

    if (!connectionDraft || event.pointerId !== connectionDraft.pointerId)
      return;
    const nextPoint = clientToCanvasPoint(event.clientX, event.clientY);
    if (!nextPoint) return;

    const nearestPointId = findNearestConnectionPointId(
      nextPoint,
      connectionDraft.sourcePointId,
    );
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
    if (
      connectionEditDraft &&
      event.pointerId === connectionEditDraft.pointerId
    ) {
      if (
        hoveredConnectionPointId &&
        hoveredConnectionPointId !== connectionEditDraft.fixedPointId
      ) {
        setConnections((prev) =>
          prev.map((connection) => {
            if (connection.id !== connectionEditDraft.connectionId)
              return connection;

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

    if (!connectionDraft || event.pointerId !== connectionDraft.pointerId)
      return;

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
    <span className="ayah-map__connection-points" aria-hidden="true">
      {CONNECTION_SIDES.map((side) => {
        const pointId = connectionPointId(ownerId, side);
        return (
          <button
            key={pointId}
            type="button"
            ref={setConnectionPointRef(pointId)}
            className={`ayah-map__connection-point ayah-map__connection-point--${side} ${
              hoveredConnectionPointId === pointId ? 'is-hovered' : ''
            }`}
            data-owner-id={ownerId}
            onPointerDown={(event) => startConnectionFromPoint(event, pointId)}
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
    if (typeof window === 'undefined') return;

    const rawCookie = getCookieValue(MAP_STATE_COOKIE_KEY);
    let rawState = null;

    if (rawCookie) {
      const decoded = decodeURIComponent(rawCookie);
      if (decoded.startsWith('local:')) {
        rawState = window.localStorage.getItem(MAP_STATE_STORAGE_KEY);
      } else {
        rawState = decoded;
      }
    } else {
      rawState = window.localStorage.getItem(MAP_STATE_STORAGE_KEY);
    }

    if (rawState) {
      try {
        const parsed = JSON.parse(rawState);
        if (parsed && Array.isArray(parsed.nodes)) {
          const initialSnapshot = {
            pan: parsed.pan || { x: 0, y: 0 },
            scale: Number.isFinite(parsed.scale) ? parsed.scale : 1,
            nodes: parsed.nodes,
            connections: Array.isArray(parsed.connections)
              ? parsed.connections
              : [],
            connectionDirection: parsed.connectionDirection || 'uni',
          };
          applySnapshot(initialSnapshot);
          historyRef.current = [
            { key: snapshotToKey(initialSnapshot), snapshot: initialSnapshot },
          ];
          redoRef.current = [];
          syncHistoryFlags();
        }
      } catch (error) {
        // Ignore broken persisted state.
      }
    }

    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      return;
    }

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

    if (typeof window !== 'undefined') {
      const raw = JSON.stringify(snapshot);
      const encoded = encodeURIComponent(raw);

      if (encoded.length <= 3500) {
        setCookieValue(MAP_STATE_COOKIE_KEY, encoded);
        window.localStorage.removeItem(MAP_STATE_STORAGE_KEY);
      } else {
        window.localStorage.setItem(MAP_STATE_STORAGE_KEY, raw);
        setCookieValue(
          MAP_STATE_COOKIE_KEY,
          encodeURIComponent(`local:${MAP_STATE_STORAGE_KEY}`),
        );
      }
    }
  }, [pan, scale, nodes, connections, connectionDirection]);

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
  }, [setMapState, nodes, pan, scale, connections, connectionDirection]);

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
  }, [nodes, pan.x, pan.y, scale]);

  useLayoutEffect(() => {
    const nextRects = {};

    selectionGroups.forEach((group) => {
      const cardElement = selectableRefs.current.get(`n:${group.nodeId}:group`);
      if (!cardElement) return;

      const cardRect = cardElement.getBoundingClientRect();
      const itemRects = group.itemIds
        .map((itemId) =>
          selectableRefs.current.get(itemId)?.getBoundingClientRect(),
        )
        .filter(Boolean);

      if (!itemRects.length) return;

      const left =
        Math.min(...itemRects.map((rect) => rect.left)) - cardRect.left;
      const top = Math.min(...itemRects.map((rect) => rect.top)) - cardRect.top;
      const right =
        Math.max(...itemRects.map((rect) => rect.right)) - cardRect.left;
      const bottom =
        Math.max(...itemRects.map((rect) => rect.bottom)) - cardRect.top;

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
    if (!selectionMode) return;
    if (connectionDraft || connectionEditDraft) return;
    if (
      event.target.closest(
        '.ayah-map__connection-line, .ayah-map__connection-endpoint',
      )
    )
      return;
    if (
      event.target.closest('.ayah-map__toolbar') ||
      event.target.closest('.ayah-map__node')
    )
      return;

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

  const onSelectPointerMoveCapture = (event) => {
    if (connectionDraft) return;
    if (!marquee || event.pointerId !== marquee.pointerId) return;
    const nextMarquee = {
      ...marquee,
      currentX: event.clientX,
      currentY: event.clientY,
    };
    setMarquee(nextMarquee);

    const selectionRect = {
      left: Math.min(nextMarquee.startX, nextMarquee.currentX),
      right: Math.max(nextMarquee.startX, nextMarquee.currentX),
      top: Math.min(nextMarquee.startY, nextMarquee.currentY),
      bottom: Math.max(nextMarquee.startY, nextMarquee.currentY),
    };
    setSelectionPreviewIds(collectIntersectingSelectableIds(selectionRect));
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

    const nextSelected = collectIntersectingSelectableIds(selectionRect);

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
        const node = nodes.find((item) => item.id === nodeId);
        const allItemIds = [];
        if (node?.type === MAP_NODE_TYPES.READY) {
          node.words.forEach((word, wordIndex) => {
            allItemIds.push(`n:${nodeId}:w:${wordIndex}`);
            word.segments.forEach((_, segmentIndex) => {
              allItemIds.push(`n:${nodeId}:s:${wordIndex}:${segmentIndex}`);
            });
          });
          allItemIds.push(`n:${nodeId}:meta`);
        }

        const hasAllItems =
          allItemIds.length > 0 &&
          allItemIds.every((itemId) => entry.items.has(itemId));

        if (hasAllItems) {
          normalizedSelection.push(`n:${nodeId}:group`);
          return;
        }

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

  return (
    <div
      className={`ayah-map ${connectionDraft || connectionEditDraft ? 'is-connecting' : ''}`}
      style={canvasStyles}
    >
      <div className="ayah-map__toolbar">
        <button
          type="button"
          className="ayah-map__arrow"
          title="Future edge tool"
          aria-label="Future edge tool"
        >
          ↗
        </button>

        <button
          type="button"
          className={`ayah-map__tool-button ${selectionMode ? 'is-active' : ''}`}
          onClick={() => setSelectionMode((prev) => !prev)}
        >
          Select
        </button>

        <button
          type="button"
          className="ayah-map__tool-button"
          onClick={performUndo}
          disabled={!canUndo}
          title="Undo (Ctrl/Cmd+Z)"
        >
          Undo
        </button>

        <button
          type="button"
          className="ayah-map__tool-button"
          onClick={performRedo}
          disabled={!canRedo}
          title="Redo (Ctrl/Cmd+Shift+Z)"
        >
          Redo
        </button>

        <button
          type="button"
          className={`ayah-map__tool-button ${connectionDirection === 'uni' ? 'is-active' : ''}`}
          onClick={() => setConnectionDirection('uni')}
        >
          -&gt;
        </button>

        <button
          type="button"
          className={`ayah-map__tool-button ${connectionDirection === 'bi' ? 'is-active' : ''}`}
          onClick={() => setConnectionDirection('bi')}
        >
          &lt;-&gt;
        </button>

        {isMobileLike ? (
          <button
            type="button"
            className={`ayah-map__seed ${tapDropMode ? 'is-active' : ''}`}
            onClick={() => setTapDropMode((prev) => !prev)}
            title="Tap and then choose location"
            aria-label="Tap-to-place ayah input"
          >
            1:1
          </button>
        ) : (
          <div
            className="ayah-map__seed"
            draggable
            onDragStart={onTemplateDragStart}
          >
            1:1
          </div>
        )}
      </div>

      <div className="ayah-map__zoom-controls">
        <button
          type="button"
          className="ayah-map__zoom-button"
          onClick={() => zoomBy(1 / 1.15)}
          aria-label="Zoom out"
          title="Zoom out"
        >
          -
        </button>

        <span className="ayah-map__zoom-readout">
          {Math.round(scale * 100)}%
        </span>

        <button
          type="button"
          className="ayah-map__zoom-button"
          onClick={() => zoomBy(1.15)}
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
      </div>

      <div
        ref={viewportRef}
        className="ayah-map__viewport"
        onWheel={onViewportWheel}
        onPointerDownCapture={(event) => {
          onViewportPointerDownCapture(event);
          onSelectPointerDownCapture(event);

          const clickedOnEmptySpace =
            !event.target.closest('.ayah-map__toolbar') &&
            !event.target.closest('.ayah-map__node') &&
            !event.target.closest('.ayah-map__connection-line') &&
            !event.target.closest('.ayah-map__connection-endpoint');
          if (
            clickedOnEmptySpace &&
            (selectedIds.length || selectedConnectionId)
          ) {
            setSelectedIds([]);
            setSelectedConnectionId(null);
          }

          if (!isMobileLike || !tapDropMode) return;
          if (
            event.target.closest('.ayah-map__toolbar') ||
            event.target.closest('.ayah-map__node')
          )
            return;
          const placed = placeNodeAtClientPoint(event.clientX, event.clientY);
          if (placed) {
            setTapDropMode(false);
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerMoveCapture={(event) => {
          const owner =
            event.target?.closest?.('.ayah-map__connectable')?.dataset
              ?.ownerId || null;
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
        }}
        onPointerCancelCapture={(event) => {
          onViewportPointerEndCapture(event);
          onConnectionPointerEndCapture(event);
          onSelectPointerEndCapture(event);
          setHoveredOwnerId(null);
        }}
        onPointerDown={startPanDrag}
        onPointerMove={movePanDrag}
        onPointerUp={stopPanDrag}
        onPointerCancel={stopPanDrag}
        onDrop={onDropToSurface}
        onDragOver={onAllowDrop}
      >
        {marqueeRect && (
          <div
            className="ayah-map__marquee"
            style={{
              left: `${marqueeRect.left}px`,
              top: `${marqueeRect.top}px`,
              width: `${marqueeRect.width}px`,
              height: `${marqueeRect.height}px`,
            }}
          />
        )}

        <div
          className="ayah-map__surface"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        >
          <svg
            className="ayah-map__connections"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <marker
                id="ayah-map-arrow-end"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path
                  className="ayah-map__arrowhead"
                  d="M 0 0 L 10 5 L 0 10 z"
                  fill="currentColor"
                />
              </marker>
            </defs>
            {connections.map((connection) => {
              const sourcePoint = anchors[connection.sourcePointId];
              const targetPoint = anchors[connection.targetPointId];
              const pathData = connectionPathData(
                connection.sourcePointId,
                connection.targetPointId,
              );
              if (!pathData) return null;

              const isSelectedConnection =
                selectedConnectionId === connection.id;

              return (
                <g key={connection.id}>
                  <path
                    d={pathData}
                    className={`ayah-map__connection-line ${isSelectedConnection ? 'is-selected' : ''}`}
                    markerEnd="url(#ayah-map-arrow-end)"
                    markerStart={
                      connection.direction === 'bi'
                        ? 'url(#ayah-map-arrow-end)'
                        : undefined
                    }
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedConnectionId(connection.id);
                    }}
                  />

                  {isSelectedConnection && sourcePoint ? (
                    <circle
                      className="ayah-map__connection-endpoint"
                      cx={sourcePoint.x}
                      cy={sourcePoint.y}
                      r="5"
                      onPointerDown={(event) =>
                        startConnectionEndpointEdit(
                          event,
                          connection.id,
                          'source',
                        )
                      }
                    />
                  ) : null}

                  {isSelectedConnection && targetPoint ? (
                    <circle
                      className="ayah-map__connection-endpoint"
                      cx={targetPoint.x}
                      cy={targetPoint.y}
                      r="5"
                      onPointerDown={(event) =>
                        startConnectionEndpointEdit(
                          event,
                          connection.id,
                          'target',
                        )
                      }
                    />
                  ) : null}
                </g>
              );
            })}

            {connectionEditDraft
              ? (() => {
                  const connection = connections.find(
                    (item) => item.id === connectionEditDraft.connectionId,
                  );
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
                      className="ayah-map__connection-line is-draft"
                      markerEnd="url(#ayah-map-arrow-end)"
                      markerStart={
                        connection.direction === 'bi'
                          ? 'url(#ayah-map-arrow-end)'
                          : undefined
                      }
                    />
                  );
                })()
              : null}

            {connectionDraft && anchors[connectionDraft.sourcePointId]
              ? (() => {
                  const draftTargetId =
                    hoveredConnectionPointId || '__draft-target__';
                  const draftAnchors = {
                    ...anchors,
                    '__draft-target__': {
                      x: connectionDraft.x,
                      y: connectionDraft.y,
                    },
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
                      className="ayah-map__connection-line is-draft"
                      markerEnd="url(#ayah-map-arrow-end)"
                    />
                  );
                })()
              : null}
          </svg>

          {nodes.map((node) => (
            <div
              key={node.id}
              className={`ayah-map__node ayah-map__node--${node.type}`}
              style={{ transform: `translate3d(${node.x}px, ${node.y}px, 0)` }}
              onPointerDown={(event) =>
                onNodePointerDown(event, node.id, node.type)
              }
            >
              {(node.type === MAP_NODE_TYPES.PLACEHOLDER ||
                node.type === MAP_NODE_TYPES.ERROR) && (
                <div className="ayah-map__address-box">
                  <input
                    value={node.address}
                    onChange={(event) =>
                      updateNode(node.id, { address: event.target.value })
                    }
                    onKeyDown={(event) => onPlaceholderKeyDown(event, node.id)}
                    onFocus={() => onPlaceholderFocus(node.id)}
                    onBlur={() => onPlaceholderBlur(node.id)}
                    className="ayah-map__address-input"
                  />
                  {node.error ? (
                    <div className="ayah-map__error">{node.error}</div>
                  ) : null}
                </div>
              )}

              {node.type === MAP_NODE_TYPES.LOADING && (
                <div className="ayah-map__loading">Loading...</div>
              )}

              {node.type === MAP_NODE_TYPES.READY &&
                (() => {
                  const groupOwnerId = `n:${node.id}:group`;
                  const groupSelected = selectedIds.includes(groupOwnerId);
                  const nodeSelectionGroups = selectionGroups.filter(
                    (group) => group.nodeId === node.id,
                  );
                  const activeSourcePointId =
                    connectionDraft?.sourcePointId ||
                    connectionEditDraft?.movingPointId ||
                    null;
                  const sourceOwnerId = activeSourcePointId
                    ? ownerIdFromPointId(activeSourcePointId)
                    : null;
                  const targetOwnerId = hoveredConnectionPointId
                    ? ownerIdFromPointId(hoveredConnectionPointId)
                    : null;

                  const connectableStateClass = (ownerId, directlySelected) => {
                    const classes = [];

                    if (directlySelected) classes.push('is-selected');
                    if (
                      !directlySelected &&
                      groupSelected &&
                      ownerId !== groupOwnerId
                    ) {
                      classes.push('is-group-selected');
                    }
                    if (hoveredOwnerId === ownerId)
                      classes.push('is-hover-owner');
                    if (sourceOwnerId === ownerId)
                      classes.push('is-connection-source');
                    if (targetOwnerId === ownerId)
                      classes.push('is-connection-target');

                    return classes.join(' ');
                  };

                  const previewSelected = (itemId) =>
                    selectionPreviewIds.includes(itemId) &&
                    !nodeSelectionGroups.some((group) =>
                      group.itemIds.includes(itemId),
                    );

                  return (
                    <div
                      ref={setSelectableRef(`n:${node.id}:group`)}
                      className={`ayah-map__ayah-card ayah-map__selectable ayah-map__connectable ${
                        node.width ? 'is-resized' : ''
                      } ${connectableStateClass(groupOwnerId, groupSelected)}`}
                      data-owner-id={groupOwnerId}
                      style={{
                        width: node.width ? `${node.width}px` : undefined,
                        height: node.height ? `${node.height}px` : undefined,
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!selectionMode) return;
                        toggleSelected(`n:${node.id}:group`);
                      }}
                    >
                      {renderConnectionPoints(`n:${node.id}:group`)}
                      <button
                        type="button"
                        className="ayah-map__resize-handle ayah-map__resize-handle--nw"
                        onPointerDown={(event) =>
                          onResizeHandlePointerDown(event, node.id, 'nw')
                        }
                        aria-label="Resize from top-left"
                      />
                      <button
                        type="button"
                        className="ayah-map__resize-handle ayah-map__resize-handle--ne"
                        onPointerDown={(event) =>
                          onResizeHandlePointerDown(event, node.id, 'ne')
                        }
                        aria-label="Resize from top-right"
                      />
                      <button
                        type="button"
                        className="ayah-map__resize-handle ayah-map__resize-handle--sw"
                        onPointerDown={(event) =>
                          onResizeHandlePointerDown(event, node.id, 'sw')
                        }
                        aria-label="Resize from bottom-left"
                      />
                      <button
                        type="button"
                        className="ayah-map__resize-handle ayah-map__resize-handle--se"
                        onPointerDown={(event) =>
                          onResizeHandlePointerDown(event, node.id, 'se')
                        }
                        aria-label="Resize from bottom-right"
                      />
                      <div className="ayah-map__ayah-content">
                        {nodeSelectionGroups.map((group) => {
                          const rect = selectionGroupRects[group.id];
                          if (!rect) return null;

                          return (
                            <div
                              key={group.id}
                              ref={setSelectableRef(group.id)}
                              className={`ayah-map__selection-group ayah-map__selectable ayah-map__connectable ${connectableStateClass(
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

                        {node.words.map((word, index) =>
                          (() => {
                            const wordOwnerId = `n:${node.id}:w:${index}`;
                            const wordSelected =
                              selectedIds.includes(wordOwnerId);
                            const wordInSubsetGroup = nodeSelectionGroups.some(
                              (group) => group.itemIds.includes(wordOwnerId),
                            );
                            return (
                              <span
                                key={`${node.id}-${index}`}
                                ref={setSelectableRef(wordOwnerId)}
                                className={`ayah-map__word-block ayah-map__selectable ayah-map__connectable ${connectableStateClass(wordOwnerId, wordSelected)} ${previewSelected(wordOwnerId) ? 'is-preview-selected' : ''} ${wordInSubsetGroup ? 'is-subset-member' : ''}`}
                                data-owner-id={wordOwnerId}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!selectionMode) return;
                                  toggleSelected(wordOwnerId);
                                }}
                              >
                                {renderConnectionPoints(wordOwnerId)}
                                <span className="ayah-map__word-text">
                                  {word.text}
                                </span>
                                <span className="ayah-map__segments">
                                  {word.segments.length ? (
                                    word.segments.map((segment, segmentIndex) =>
                                      (() => {
                                        const segmentOwnerId = `n:${node.id}:s:${index}:${segmentIndex}`;
                                        const segmentSelected =
                                          selectedIds.includes(segmentOwnerId);
                                        const segmentInSubsetGroup =
                                          nodeSelectionGroups.some((group) =>
                                            group.itemIds.includes(
                                              segmentOwnerId,
                                            ),
                                          );
                                        return (
                                          <span
                                            key={`${node.id}-${index}-${segmentIndex}`}
                                            ref={setSelectableRef(
                                              segmentOwnerId,
                                            )}
                                            className={`ayah-map__segment-item ayah-map__selectable ayah-map__connectable ${connectableStateClass(segmentOwnerId, segmentSelected)} ${previewSelected(segmentOwnerId) ? 'is-preview-selected' : ''} ${segmentInSubsetGroup ? 'is-subset-member' : ''}`}
                                            data-owner-id={segmentOwnerId}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              if (!selectionMode) return;
                                              toggleSelected(segmentOwnerId);
                                            }}
                                          >
                                            {renderConnectionPoints(
                                              segmentOwnerId,
                                            )}
                                            {segment}
                                          </span>
                                        );
                                      })(),
                                    )
                                  ) : (
                                    <span className="ayah-map__segment-item">
                                      ---
                                    </span>
                                  )}
                                </span>
                              </span>
                            );
                          })(),
                        )}
                        {(() => {
                          const metaOwnerId = `n:${node.id}:meta`;
                          const metaSelected =
                            selectedIds.includes(metaOwnerId);
                          const metaInSubsetGroup = nodeSelectionGroups.some(
                            (group) => group.itemIds.includes(metaOwnerId),
                          );
                          return (
                            <span
                              ref={setSelectableRef(metaOwnerId)}
                              className={`ayah-map__meta-trail ayah-map__selectable ayah-map__connectable ${connectableStateClass(metaOwnerId, metaSelected)} ${previewSelected(metaOwnerId) ? 'is-preview-selected' : ''} ${metaInSubsetGroup ? 'is-subset-member' : ''}`}
                              data-owner-id={metaOwnerId}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!selectionMode) return;
                                toggleSelected(metaOwnerId);
                              }}
                            >
                              {renderConnectionPoints(metaOwnerId)}
                              <span className="ayah-map__address-label">
                                {node.address}
                              </span>
                              <span className="ayah-map__surah-label">
                                {surahs?.[node.surahNumber]?.[0] || ''}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AyahMapCanvas;
