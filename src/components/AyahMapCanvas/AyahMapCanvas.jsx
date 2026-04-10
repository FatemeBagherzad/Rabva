import { MAP_NODE_TYPES, useAyahMapCanvas } from '../../hooks/useAyahMapCanvas';
import { useMemo, useState } from 'react';
import './AyahMapCanvas.scss';

const AyahMapCanvas = ({ preferences, surahs }) => {
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
  } = useAyahMapCanvas(preferences);
  const [tapDropMode, setTapDropMode] = useState(false);

  const isMobileLike = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse), (max-width: 900px)').matches;
  }, []);

  return (
    <div className="ayah-map" style={canvasStyles}>
      <div className="ayah-map__toolbar">
        <button type="button" className="ayah-map__arrow" title="Future edge tool" aria-label="Future edge tool">
          ↗
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
          <div className="ayah-map__seed" draggable onDragStart={onTemplateDragStart}>
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

        <span className="ayah-map__zoom-readout">{Math.round(scale * 100)}%</span>

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
          if (!isMobileLike || !tapDropMode) return;
          if (event.target.closest('.ayah-map__toolbar') || event.target.closest('.ayah-map__node')) return;
          const placed = placeNodeAtClientPoint(event.clientX, event.clientY);
          if (placed) {
            setTapDropMode(false);
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerMoveCapture={onViewportPointerMoveCapture}
        onPointerUpCapture={onViewportPointerEndCapture}
        onPointerCancelCapture={onViewportPointerEndCapture}
        onPointerDown={startPanDrag}
        onPointerMove={movePanDrag}
        onPointerUp={stopPanDrag}
        onPointerCancel={stopPanDrag}
        onDrop={onDropToSurface}
        onDragOver={onAllowDrop}
      >
        <div
          className="ayah-map__surface"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        >
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`ayah-map__node ayah-map__node--${node.type}`}
              style={{ transform: `translate3d(${node.x}px, ${node.y}px, 0)` }}
              onPointerDown={(event) => onNodePointerDown(event, node.id, node.type)}
            >
              {(node.type === MAP_NODE_TYPES.PLACEHOLDER || node.type === MAP_NODE_TYPES.ERROR) && (
                <div className="ayah-map__address-box">
                  <input
                    value={node.address}
                    onChange={(event) => updateNode(node.id, { address: event.target.value })}
                    onKeyDown={(event) => onPlaceholderKeyDown(event, node.id)}
                    onFocus={() => onPlaceholderFocus(node.id)}
                    onBlur={() => onPlaceholderBlur(node.id)}
                    className="ayah-map__address-input"
                  />
                  {node.error ? <div className="ayah-map__error">{node.error}</div> : null}
                </div>
              )}

              {node.type === MAP_NODE_TYPES.LOADING && <div className="ayah-map__loading">Loading...</div>}

              {node.type === MAP_NODE_TYPES.READY && (
                <div
                  className={`ayah-map__ayah-card ${node.width ? 'is-resized' : ''}`}
                  style={{
                    width: node.width ? `${node.width}px` : undefined,
                    height: node.height ? `${node.height}px` : undefined,
                  }}
                >
                  <button
                    type="button"
                    className="ayah-map__resize-handle ayah-map__resize-handle--nw"
                    onPointerDown={(event) => onResizeHandlePointerDown(event, node.id, 'nw')}
                    aria-label="Resize from top-left"
                  />
                  <button
                    type="button"
                    className="ayah-map__resize-handle ayah-map__resize-handle--ne"
                    onPointerDown={(event) => onResizeHandlePointerDown(event, node.id, 'ne')}
                    aria-label="Resize from top-right"
                  />
                  <button
                    type="button"
                    className="ayah-map__resize-handle ayah-map__resize-handle--sw"
                    onPointerDown={(event) => onResizeHandlePointerDown(event, node.id, 'sw')}
                    aria-label="Resize from bottom-left"
                  />
                  <button
                    type="button"
                    className="ayah-map__resize-handle ayah-map__resize-handle--se"
                    onPointerDown={(event) => onResizeHandlePointerDown(event, node.id, 'se')}
                    aria-label="Resize from bottom-right"
                  />
                  <div className="ayah-map__ayah-content">
                    {node.words.map((word, index) => (
                      <span key={`${node.id}-${index}`} className="ayah-map__word-block">
                        <span className="ayah-map__word-text">{word.text}</span>
                        <span className="ayah-map__segments">
                          {word.segments.length ? (
                            word.segments.map((segment, segmentIndex) => (
                              <span
                                key={`${node.id}-${index}-${segmentIndex}`}
                                className="ayah-map__segment-item"
                              >
                                {segment}
                              </span>
                            ))
                          ) : (
                            <span className="ayah-map__segment-item">---</span>
                          )}
                        </span>
                      </span>
                    ))}
                    <span className="ayah-map__meta-trail">
                      <span className="ayah-map__address-label">{node.address}</span>
                      <span className="ayah-map__surah-label">{surahs?.[node.surahNumber]?.[0] || ''}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AyahMapCanvas;
