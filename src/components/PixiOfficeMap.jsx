import 'pixi.js/unsafe-eval';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { useStore, useActions } from '../lib/store.jsx';
import { MovementController } from '../lib/movement.js';
import { MAP_W, MAP_H } from '../lib/office-map.js';
import { createOfficeScene } from '../pixi/scene/officeScene.js';
import { hitTestFurniture } from '../lib/tile-map.js';
import FurniturePanel from './FurniturePanel.jsx';

export default function PixiOfficeMap() {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const appRef = useRef(null);
  const sceneRef = useRef(null);
  const cleanupRef = useRef(() => {});
  const [hoveredAgent, setHoveredAgent] = useState(null);
  const hoveredFurnitureRef = useRef(null);
  const [activePanel, setActivePanel] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [debugCoords, setDebugCoords] = useState(null);
  const DEBUG_COORDS = false;
  const { agents, selectedAgentId } = useStore();
  const { selectAgent, deselectAgent } = useActions();
  const agentsRef = useRef(agents);
  const selectedRef = useRef(selectedAgentId);
  const hoveredRef = useRef(hoveredAgent);

  agentsRef.current = agents;
  selectedRef.current = selectedAgentId;
  hoveredRef.current = hoveredAgent;

  if (!controllerRef.current) {
    controllerRef.current = new MovementController();
  }

  useEffect(() => {
    controllerRef.current.sync(agents);
  }, [agents]);

  const handlePointer = useCallback((clientX, clientY, mode = 'click') => {
    const scene = sceneRef.current;
    const controller = controllerRef.current;
    const app = appRef.current;
    if (!scene || !controller || !app) return;

    const rect = app.canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const mapCoords = scene.screenToWorld(localX, localY);

    if (mode === 'hover') {
      if (DEBUG_COORDS) {
        setDebugCoords({ x: Math.round(mapCoords.x), y: Math.round(mapCoords.y), screenX: localX, screenY: localY });
      }

      // Check furniture hover
      const furnitureHit = hitTestFurniture(mapCoords.x, mapCoords.y);
      const furnitureId = furnitureHit ? furnitureHit.id : null;
      if (furnitureId !== hoveredFurnitureRef.current) {
        hoveredFurnitureRef.current = furnitureId;
        scene.highlightFurniture(furnitureId);
      }

      // Check agent hover
      const hitId = controller.hitTest(mapCoords.x, mapCoords.y);
      if (hitId !== hoveredRef.current) {
        setHoveredAgent(hitId);
      }

      app.canvas.style.cursor = (furnitureHit || hitId) ? 'pointer' : 'default';
      return;
    }

    // Click mode
    const hitId = controller.hitTest(mapCoords.x, mapCoords.y);
    if (hitId) {
      selectAgent(hitId);
      setActivePanel(null);
      return;
    }

    // Check furniture click
    const furnitureHit = hitTestFurniture(mapCoords.x, mapCoords.y);
    if (furnitureHit) {
      setActivePanel(furnitureHit);
      deselectAgent();
      return;
    }

    deselectAgent();
    setActivePanel(null);
  }, [deselectAgent, selectAgent]);

  useEffect(() => {
    let cancelled = false;

    async function mount() {
      const host = containerRef.current;
      if (!host) return;

      try {
        setLoadError('');
        const app = new Application();
        await app.init({
          backgroundAlpha: 0,
          antialias: false,
          autoDensity: true,
          resolution: window.devicePixelRatio || 1,
        });
        app.renderer.roundPixels = true;
        if (cancelled) {
          app.destroy(true, { children: true, texture: false });
          return;
        }

        app.canvas.className = 'workspace-canvas workspace-pixi-canvas';
        app.canvas.style.display = 'block';
        app.canvas.style.width = '100%';
        app.canvas.style.imageRendering = 'pixelated';
        app.canvas.style.cursor = 'default';
        host.replaceChildren(app.canvas);

        const scene = await createOfficeScene(app);
        if (cancelled) {
          scene.destroy();
          app.destroy(true, { children: true, texture: false });
          return;
        }

        appRef.current = app;
        sceneRef.current = scene;

        const resize = () => {
          const rect = host.getBoundingClientRect();
          const width = Math.max(640, Math.floor(rect.width));
          const zoom = 1.0;
          const height = Math.max(860, Math.floor(MAP_H * Math.min((width / MAP_W) * zoom, 1)) + 12);
          app.renderer.resize(width, height);
          app.canvas.style.height = `${height}px`;
          scene.resize(width, height);
        };

        const onClick = (event) => handlePointer(event.clientX, event.clientY, 'click');
        const onMove = (event) => handlePointer(event.clientX, event.clientY, 'hover');
        const onLeave = () => {
          setHoveredAgent(null);
          hoveredFurnitureRef.current = null;
          if (sceneRef.current) sceneRef.current.highlightFurniture(null);
          app.canvas.style.cursor = 'default';
        };

        app.canvas.addEventListener('click', onClick);
        app.canvas.addEventListener('mousemove', onMove);
        app.canvas.addEventListener('mouseleave', onLeave);
        window.addEventListener('resize', resize);
        resize();

        app.ticker.add(() => {
          controllerRef.current.update(app.ticker.deltaMS, agentsRef.current);
          scene.render({
            sprites: controllerRef.current.getAllSprites(),
            agents: agentsRef.current,
            selectedAgentId: selectedRef.current,
            hoveredAgentId: hoveredRef.current,
          });
        });

        cleanupRef.current = () => {
          window.removeEventListener('resize', resize);
          app.canvas.removeEventListener('click', onClick);
          app.canvas.removeEventListener('mousemove', onMove);
          app.canvas.removeEventListener('mouseleave', onLeave);
          scene.destroy();
          app.destroy(true, { children: true, texture: false });
        };
      } catch (error) {
        console.error('PixiOfficeMap failed to initialize', error);
        setLoadError(error?.message || String(error));
      }
    }

    mount();

    return () => {
      cancelled = true;
      cleanupRef.current();
      cleanupRef.current = () => {};
      sceneRef.current = null;
      appRef.current = null;
    };
  }, [handlePointer]);

  return (
    <div className="workspace-container" ref={containerRef} style={{ position: 'relative' }}>
      {loadError ? <div className="workspace-error">Map failed to load: {loadError}</div> : null}
      {DEBUG_COORDS && debugCoords && (
        <div style={{
          position: 'absolute',
          left: debugCoords.screenX + 12,
          top: debugCoords.screenY - 8,
          background: 'rgba(0,0,0,0.85)',
          color: '#0f0',
          fontFamily: 'monospace',
          fontSize: '11px',
          padding: '2px 6px',
          borderRadius: '3px',
          pointerEvents: 'none',
          zIndex: 999,
          whiteSpace: 'nowrap',
        }}>
          {debugCoords.x}, {debugCoords.y}
        </div>
      )}
      {activePanel && (
        <FurniturePanel
          action={activePanel.action}
          label={activePanel.label}
          icon={activePanel.icon}
          agents={agents}
          onClose={() => setActivePanel(null)}
        />
      )}
    </div>
  );
}
