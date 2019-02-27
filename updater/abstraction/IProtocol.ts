interface IProtocol {
  registerProtocolHandler(scheme : string, handler : Function, onError? : Function) : any
}