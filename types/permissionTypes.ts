export const enum Permission {
    Host = 1 << 0,
    PlaybackControl = 1 << 1,
    QueueControl = 1 << 2,
  }

export const checkPermission = (permission: Permission, neededPermission: Permission) => {
  return (permission & neededPermission) === neededPermission
}
