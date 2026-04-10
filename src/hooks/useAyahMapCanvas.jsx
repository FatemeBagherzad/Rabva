import { useMemo, useRef, useState } from 'react';
import { resolveAyahAddressToWords } from '../services/ayahMapService';

export const MAP_NODE_TYPES = {
  PLACEHOLDER: 'placeholder',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
};

export const useAyahMapCanvas = (preferences) => {
  const viewportRef = useRef(null);
  const pendingNodePatchesRef = useRef(new Map());
  const rafIdRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragPan, setDragPan] = useState(null);
  const [dragNode, setDragNode] = useState(null);
  const [resizeNode, setResizeNode] = useState(null);
  const [nodes, setNodes] = useState([]);

  const canvasStyles = useMemo(
    () => ({
      '--map-quran-font-family': preferences?.quran_font_family || 'hafs-django',
      '--map-quran-font-size': `${preferences?.quran_font_size || 2.5}rem`,
      '--map-translation-font-family': preferences?.translation_font_family || 'inter',
      '--map-translation-font-size': `${preferences?.translation_font_size || 1.2}rem`,
      '--map-line-height-quran': preferences?.line_height_quran || 2,
      '--map-line-height-translation': preferences?.line_height_translation || 1.5,
    }),
    [preferences],
  );

  const flushQueuedNodePatches = () => {
    rafIdRef.current = null;
    const patchMap = pendingNodePatchesRef.current;
    if (!patchMap.size) return;

    const patches = new Map(patchMap);
    patchMap.clear();

    setNodes((prev) =>
      prev.map((node) => {
        const patch = patches.get(node.id);
        return patch ? { ...node, ...patch } : node;
      }),
    );
  };

  const queueNodePatch = (id, patch) => {
    const current = pendingNodePatchesRef.current.get(id) || {};
    pendingNodePatchesRef.current.set(id, { ...current, ...patch });

    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(flushQueuedNodePatches);
    }
  };

  const startPanDrag = (event) => {
    if (event.target.closest('.ayah-map__toolbar') || event.target.closest('.ayah-map__node')) {
      return;
    }

    if (event.currentTarget?.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore pointer-capture failures and continue with best effort drag behavior.
      }
    }

    setDragPan({
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    });
  };

  const movePanDrag = (event) => {
    if (resizeNode) {
      if (event.pointerId !== resizeNode.pointerId) return;

      const dx = event.clientX - resizeNode.startX;
      const dy = event.clientY - resizeNode.startY;
      const minWidth = 140;
      const minHeight = 54;
      let nextX = resizeNode.startNodeX;
      let nextY = resizeNode.startNodeY;
      let nextWidth = resizeNode.startWidth;
      let nextHeight = resizeNode.startHeight;

      if (resizeNode.handle.includes('e')) {
        nextWidth = Math.max(minWidth, resizeNode.startWidth + dx);
      }
      if (resizeNode.handle.includes('w')) {
        nextWidth = Math.max(minWidth, resizeNode.startWidth - dx);
        nextX = resizeNode.startNodeX + (resizeNode.startWidth - nextWidth);
      }
      if (resizeNode.handle.includes('s')) {
        nextHeight = Math.max(minHeight, resizeNode.startHeight + dy);
      }
      if (resizeNode.handle.includes('n')) {
        nextHeight = Math.max(minHeight, resizeNode.startHeight - dy);
        nextY = resizeNode.startNodeY + (resizeNode.startHeight - nextHeight);
      }

      queueNodePatch(resizeNode.id, {
        x: nextX,
        y: nextY,
        width: nextWidth,
        height: nextHeight,
      });
      return;
    }

    if (dragNode) {
      if (event.pointerId !== dragNode.pointerId) return;

      const deltaX = event.clientX - dragNode.startX;
      const deltaY = event.clientY - dragNode.startY;
      queueNodePatch(dragNode.id, {
        x: dragNode.startNodeX + deltaX,
        y: dragNode.startNodeY + deltaY,
      });
      return;
    }

    if (!dragPan) return;
    if (event.pointerId !== dragPan.pointerId) return;

    setPan({
      x: dragPan.startPanX + (event.clientX - dragPan.startX),
      y: dragPan.startPanY + (event.clientY - dragPan.startY),
    });
  };

  const stopPanDrag = (event) => {
    if (resizeNode) {
      if (event && event.pointerId !== resizeNode.pointerId) return;

      const resizedCard = resizeNode.captureTarget?.closest('.ayah-map__ayah-card');
      if (resizedCard) {
        const currentHeight = Math.ceil(resizedCard.getBoundingClientRect().height);
        const contentHeight = Math.ceil(resizedCard.scrollHeight);
        if (contentHeight > currentHeight) {
          queueNodePatch(resizeNode.id, { height: contentHeight });
        }
      }

      if (resizeNode.captureTarget?.releasePointerCapture) {
        try {
          resizeNode.captureTarget.releasePointerCapture(resizeNode.pointerId);
        } catch (error) {
          // Ignore release errors.
        }
      }

      setResizeNode(null);
      return;
    }

    if (dragNode) {
      if (event && event.pointerId !== dragNode.pointerId) return;

      if (dragNode.captureTarget?.releasePointerCapture) {
        try {
          dragNode.captureTarget.releasePointerCapture(dragNode.pointerId);
        } catch (error) {
          // Ignore release errors.
        }
      }

      setDragNode(null);
      return;
    }

    if (!dragPan) return;

    if (event && event.pointerId !== dragPan.pointerId) return;

    if (dragPan.captureTarget?.releasePointerCapture) {
      try {
        dragPan.captureTarget.releasePointerCapture(dragPan.pointerId);
      } catch (error) {
        // Ignore release errors.
      }
    }

    setDragPan(null);
  };

  const onNodePointerDown = (event, id, type) => {
    if (event.target.closest('input, textarea, button')) return;
    if (event.target.closest('.ayah-map__resize-handle')) return;

    const node = nodes.find((item) => item.id === id);
    if (!node) return;

    event.stopPropagation();

    if (event.currentTarget?.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore pointer-capture failures and continue with best effort drag behavior.
      }
    }

    setDragNode({
      id,
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      startNodeX: node.x,
      startNodeY: node.y,
    });
  };

  const onResizeHandlePointerDown = (event, id, handle) => {
    event.stopPropagation();
    event.preventDefault();

    const node = nodes.find((item) => item.id === id);
    if (!node) return;

    const card = event.currentTarget.closest('.ayah-map__ayah-card');
    if (!card) return;

    const rect = card.getBoundingClientRect();

    if (event.currentTarget?.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore pointer-capture failures.
      }
    }

    setResizeNode({
      id,
      handle,
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      startNodeX: node.x,
      startNodeY: node.y,
      startWidth: node.width || rect.width,
      startHeight: node.height || rect.height,
    });
  };

  const panBy = (dx, dy) => {
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const onTemplateDragStart = (event) => {
    event.dataTransfer.setData('text/plain', '1:1');
    event.dataTransfer.effectAllowed = 'copy';
  };

  const onDropToSurface = (event) => {
    event.preventDefault();

    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const dropX = event.clientX - rect.left - pan.x;
    const dropY = event.clientY - rect.top - pan.y;

    setNodes((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        x: dropX,
        y: dropY,
        address: '1:1',
        type: MAP_NODE_TYPES.PLACEHOLDER,
        words: [],
        error: '',
        width: null,
        height: null,
      },
    ]);
  };

  const onAllowDrop = (event) => {
    event.preventDefault();
  };

  const updateNode = (id, patch) => {
    setNodes((prev) => prev.map((node) => (node.id === id ? { ...node, ...patch } : node)));
  };

  const resolveNodeAyah = async (id) => {
    const node = nodes.find((item) => item.id === id);
    if (!node) return;

    updateNode(id, { type: MAP_NODE_TYPES.LOADING, error: '' });

    try {
      const result = await resolveAyahAddressToWords(node.address);
      if (!result.ok) {
        updateNode(id, { type: MAP_NODE_TYPES.ERROR, error: result.error || 'Invalid address' });
        return;
      }

      updateNode(id, {
        type: MAP_NODE_TYPES.READY,
        words: result.words,
        address: result.normalizedAddress,
        error: '',
      });
    } catch (error) {
      updateNode(id, {
        type: MAP_NODE_TYPES.ERROR,
        error: 'Failed to load ayah',
      });
    }
  };

  const onPlaceholderKeyDown = (event, id) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      resolveNodeAyah(id);
    }
  };

  return {
    viewportRef,
    pan,
    nodes,
    canvasStyles,
    startPanDrag,
    movePanDrag,
    stopPanDrag,
    panBy,
    onTemplateDragStart,
    onDropToSurface,
    onAllowDrop,
    updateNode,
    onPlaceholderKeyDown,
    onNodePointerDown,
    onResizeHandlePointerDown,
  };
};
