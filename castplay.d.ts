// castplay — asciicast v2 player. https://github.com/sivashanmukh/castplay

/** asciicast v2: raw file text, the parsed array, or a split header/events pair. */
export type Cast =
  | string
  | [CastHeader, ...CastEvent[]]
  | { header: CastHeader; events: CastEvent[] };

export interface CastHeader {
  version: 2;
  width: number;
  height: number;
  timestamp?: number;
  idle_time_limit?: number;
  title?: string;
  env?: Record<string, string | null>;
}

/** [time in seconds, "o" output | "i" input, data] */
export type CastEvent = [number, string, string];

export interface MountOptions {
  /** Where the player opens: 'end' (default) shows the outcome, or a time in seconds. */
  poster?: 'end' | 'start' | number;
  /** Clip gaps longer than this, in seconds. Defaults to the cast's idle_time_limit or 1.2. */
  idleLimit?: number;
  speed?: number;
  /** Override the recording's height. */
  rows?: number;
  autoplay?: boolean;
  /** aria-label on the screen element. */
  label?: string;
}

export interface Player {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  /** Duration in seconds, after idle clipping. */
  readonly duration: number;
  /** The whole session as plain text, for a transcript. */
  text(): string;
}

/** A terminal screen with no DOM: usable in Node. */
export class Screen {
  constructor(cols?: number, rows?: number);
  write(data: string): void;
  html(): string;
  text(): string;
  reset(): void;
}

export function mount(el: Element, cast: Cast, opts?: MountOptions): Player;
/** Mounts every [data-castplay] element, in document order. */
export function auto(root?: ParentNode): Player[];
export function parse(cast: Cast): { head: CastHeader; events: CastEvent[] };
