// Global Socket.IO instance export
let ioInstance: any = null;

export function setIO(io: any) {
  ioInstance = io;
}

export function getIO() {
  return ioInstance;
}
