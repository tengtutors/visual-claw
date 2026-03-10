import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useStore, useActions } from '../lib/store.jsx';
import { MovementController } from '../lib/movement.js';
import { renderScene, screenToMap } from '../lib/sprite-renderer.js';
import { MAP_W, MAP_H } from '../lib/office-map.js';

export default function WorkspaceCanvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const transformRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 });
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const [hoveredAgent, setHoveredAgent] = useState(null);
  const { agents, selectedAgentId } = useStore();
  const { selectAgent, deselectAgent } = useActions();
  const agentsRef = useRef(agents);
  const selectedRef = useRef(selectedAgentId);
  const hoveredRef = useRef(hoveredAgent);

  // Keep refs in sync
  agentsRef.current = agents;
  selectedRef.current = selectedAgentId;
  hoveredRef.current = hoveredAgent;

  // Initialize controller
  if (!controllerRef.current) {
    controllerRef.current = new MovementController();
  }

  // Sync agents into movement controller
  useEffect(() => {
    controllerRef.current.sync(agents);
  }, [agents]);

  // Resize canvas — fill container width, compute height from map aspect ratio
  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const containerW = rect.width;
    const aspectRatio = MAP_H / MAP_W;
    const canvasH = containerW * aspectRatio;

    canvas.width = containerW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = containerW + 'px';
    canvas.style.height = canvasH + 'px';
  }, []);

  // Animation loop + resize observer
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ResizeObserver for container-based sizing (use rAF to avoid loop error)
    let ro;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      let roRaf;
      ro = new ResizeObserver(() => {
        cancelAnimationFrame(roRaf);
        roRaf = requestAnimationFrame(resizeCanvas);
      });
      ro.observe(containerRef.current);
    }

    const loop = (timestamp) => {
      const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;

      const controller = controllerRef.current;
      const canvas = canvasRef.current;
      if (!canvas || !controller) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;

      // Update movement
      controller.update(dt, agentsRef.current);

      // Render
      ctx.save();
      ctx.scale(dpr, dpr);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const transform = renderScene(
        ctx, w, h,
        controller.getAllSprites(),
        agentsRef.current,
        selectedRef.current,
        hoveredRef.current
      );
      transformRef.current = transform;
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (ro) ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [resizeCanvas]);

  // Click handling
  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const mapCoords = screenToMap(screenX, screenY, transformRef.current);

    const hitId = controllerRef.current.hitTest(mapCoords.x, mapCoords.y);
    if (hitId) {
      selectAgent(hitId);
    } else {
      deselectAgent();
    }
  }, [selectAgent, deselectAgent]);

  // Hover handling
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const mapCoords = screenToMap(screenX, screenY, transformRef.current);

    const hitId = controllerRef.current.hitTest(mapCoords.x, mapCoords.y);
    if (hitId !== hoveredRef.current) {
      setHoveredAgent(hitId);
      canvas.style.cursor = hitId ? 'pointer' : 'default';
    }
  }, []);

  return (
    <div className="workspace-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="workspace-canvas"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
}
