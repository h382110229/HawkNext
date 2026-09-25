import type { Event, IDisposable } from "@hawknext/rpc";
import type { HawkNextProtocolMessage } from "@hawknext/shared";

export type HawkNextProtocolTransportKind = "stdio" | "websocket" | "memory";

export interface HawkNextProtocolTransportClosedEvent {
  code?: number | null;
  signal?: NodeJS.Signals | null;
  reason?: string;
}

export interface HawkNextProtocolTransport extends IDisposable {
  readonly kind: HawkNextProtocolTransportKind;
  readonly onMessage: Event<HawkNextProtocolMessage>;
  readonly onClose: Event<HawkNextProtocolTransportClosedEvent>;
  send(message: HawkNextProtocolMessage): Promise<void>;
  disposeAndWait?(): Promise<void>;
}
