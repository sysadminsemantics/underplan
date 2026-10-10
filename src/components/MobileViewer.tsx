import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, ListChecks, X, Maximize2 } from 'lucide-react';
import { Canvas } from './Canvas';
import { BrandLogo } from './BrandLogo';
import { calculateBoardDimensions, generateTileMatrix } from '../lib/geometry';
import { generateBOM } from '../lib/bom';
import type { BoardConfig, BoardState, CustomAccessoryDefinition, PlacedChannel } from '../lib';

interface Props {
  title: string;
  boardConfig: BoardConfig;
  channels: PlacedChannel[];
  categories: { id: string; name: string; color: string }[];
  customAccessories: CustomAccessoryDefinition[];
  onOpenProjects: () => void;
}

const noop = () => {};
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;

/** Read-only phone view: pan/pinch the layout and read the parts list. Editing stays on desktop. */
export const MobileViewer: React.FC<Props> = ({
  title, boardConfig, channels, categories, customAccessories, onOpenProjects,
}) => {
  const areaRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showParts, setShowParts] = useState(false);
  const view = useRef({ zoom: 1, pan: { x: 0, y: 0 } });
  view.current = { zoom, pan };

  const fit = () => {
    const el = areaRef.current;
    if (!el) return;
    const dims = calculateBoardDimensions(boardConfig);
    const pitch = boardConfig.holePitchMm ?? 25;
    const bw = dims.totalHolesX * pitch + 60;
    const bh = dims.totalHolesY * pitch + 60;
    const z = Math.min((el.clientWidth - 16) / bw, (el.clientHeight - 16) / bh, 1.5);
    setZoom(z);
    setPan({ x: (el.clientWidth - bw * z) / 2, y: (el.clientHeight - bh * z) / 2 });
  };
  useEffect(fit, [boardConfig]);

  // Touch: one finger pans, two fingers pinch-zoom around their midpoint.
  const touches = useRef<{ d: number; mx: number; my: number; x: number; y: number } | null>(null);
  const read = (e: React.TouchEvent) => {
    const r = areaRef.current!.getBoundingClientRect();
    const [a, b] = [e.touches[0], e.touches[1]];
    if (b) {
      return {
        d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        mx: (a.clientX + b.clientX) / 2 - r.left, my: (a.clientY + b.clientY) / 2 - r.top,
        x: 0, y: 0,
      };
    }
    return { d: 0, mx: 0, my: 0, x: a.clientX, y: a.clientY };
  };
  const onTouchStart = (e: React.TouchEvent) => { touches.current = read(e); };
  const onTouchMove = (e: React.TouchEvent) => {
    const prev = touches.current;
    if (!prev) return;
    const cur = read(e);
    const { zoom: z, pan: p } = view.current;
    if (cur.d && prev.d) {
      const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * (cur.d / prev.d)));
      const k = nz / z;
      setZoom(nz);
      setPan({ x: cur.mx - (prev.mx - p.x) * k, y: cur.my - (prev.my - p.y) * k });
    } else if (!cur.d && !prev.d) {
      setPan({ x: p.x + cur.x - prev.x, y: p.y + cur.y - prev.y });
    }
    touches.current = cur;
  };
  const onTouchEnd = (e: React.TouchEvent) => { touches.current = e.touches.length ? read(e) : null; };

  const bom = useMemo(() => {
    const state: BoardState = {
      config: boardConfig, tiles: generateTileMatrix(boardConfig), channels, selectedChannelId: null,
    };
    return generateBOM(state, 10);
  }, [boardConfig, channels]);

  const s = bom.summary;
  return (
    <div className="h-full w-full flex flex-col bg-[#0E0F12] text-slate-100 font-sans">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <BrandLogo size={28} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{title}</div>
          <div className="text-[11px] text-slate-400">
            {boardConfig.platform} · {boardConfig.cols}×{boardConfig.rows} tiles · view only
          </div>
        </div>
        <button onClick={onOpenProjects} className="p-2 rounded-lg bg-white/10" aria-label="Projects">
          <FolderOpen size={18} />
        </button>
      </div>

      <div
        ref={areaRef}
        className="relative flex-1 overflow-hidden"
        style={{ touchAction: 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="absolute inset-0 pointer-events-none">
          <Canvas
            boardConfig={boardConfig}
            channels={channels}
            selectedChannelId={null}
            onSelectChannel={noop}
            onUpdateChannel={noop}
            onDeleteChannel={noop}
            onAddChannel={noop}
            activeTool="select"
            onResetTool={noop}
            activeCategory={(categories[0]?.id ?? 'power') as any}
            placementRotation={0}
            straightLength={10}
            categories={categories as any}
            customAccessories={customAccessories}
            zoom={zoom}
            onZoomChange={noop}
            pan={pan}
            onPanChange={noop}
          />
        </div>
        <button
          onClick={fit}
          className="absolute right-3 bottom-3 p-2.5 rounded-full bg-white/10 backdrop-blur"
          aria-label="Fit to screen"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      <button
        onClick={() => setShowParts(true)}
        className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-[#15161A]"
      >
        <span className="flex items-center gap-2 text-sm">
          <ListChecks size={16} className="text-emerald-400" /> Parts list
        </span>
        <span className="text-xs text-slate-400">
          {s.totalChannels} channels · {s.totalSnapCountWithSpares} snaps
        </span>
      </button>

      {showParts && (
        <div className="absolute inset-0 z-50 flex flex-col bg-[#0E0F12]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="font-semibold">Parts list</div>
            <button onClick={() => setShowParts(false)} className="p-2 rounded-lg bg-white/10" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto p-4 space-y-2">
            <div className="text-xs text-slate-400 mb-2">
              {s.totalChannels} channels · {Math.round(s.totalChannelLengthMm)} mm total · includes{' '}
              {s.spareSnapPercent}% spare snaps
            </div>
            {bom.items.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm truncate">{it.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{it.partNumber}</div>
                </div>
                <div className="text-sm font-mono text-emerald-400 whitespace-nowrap">
                  ×{it.quantity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
