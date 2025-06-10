import { useRef, useEffect } from 'react';

const HorizontalScrollArea = ({ children }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    const container = scrollRef.current;

    const handleWheel = (e) => {
      if (container) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div
      ref={scrollRef}
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}
    >
      {children}
    </div>
  );
};

export default HorizontalScrollArea;
