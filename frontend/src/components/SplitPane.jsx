import { useState, useRef, useEffect } from 'react';

export const SplitPane = ({
  children,
  direction = 'vertical',
  initialPosition = 50,
  topChildren,
  bottomChildren,
}) => {
  const [splitPosition, setSplitPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const isHorizontal = direction === 'horizontal';
  const MIN_SIZE = isHorizontal ? 30 : 20;

  const [firstChild, secondChild] = children || [topChildren, bottomChildren];

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.classList.add('dragging');
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    const newPosition = isHorizontal
      ? ((e.clientX - containerRect.left) / containerRect.width) * 100
      : ((e.clientY - containerRect.top) / containerRect.height) * 100;

    const clampedPosition = Math.max(MIN_SIZE, Math.min(100 - MIN_SIZE, newPosition));
    setSplitPosition(clampedPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.classList.remove('dragging');
  };

  const handleDoubleClick = () => {
    setSplitPosition(50);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const containerClass = isHorizontal ? 'flex flex-row' : 'flex flex-col';
  const dividerClass = isHorizontal
    ? 'split-divider-horizontal'
    : 'split-divider';
  const firstPaneStyle = isHorizontal
    ? { width: `${splitPosition}%` }
    : { height: `${splitPosition}%` };
  const secondPaneStyle = isHorizontal
    ? { width: `${100 - splitPosition}%` }
    : { height: `${100 - splitPosition}%` };

  return (
    <div ref={containerRef} className={`h-full w-full ${containerClass}`}>
      <div
        className="overflow-hidden"
        style={firstPaneStyle}
      >
        {firstChild}
      </div>

      <div
        className={dividerClass}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />

      <div
        className="overflow-hidden"
        style={secondPaneStyle}
      >
        {secondChild}
      </div>
    </div>
  );
};
