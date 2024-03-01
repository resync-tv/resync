declare module "#internal/nitro/utils" {
  function trapUnhandledNodeErrors(): void
}

declare module "#internal/nitro/shutdown" {
  function setupGracefulShutdown(listener: HttpServer, nitroApp: NitroApp): void
}

declare type ExtendedH3Event = H3Event<EventHandlerRequest> & {
  _socket?: SocketServer
}
