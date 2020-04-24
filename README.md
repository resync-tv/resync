# w2g
### Watch YouTube videos with your friends.

>I got annoyed by watch2gether.com, so I built this thing which is more simple and less cluttered. Not intended for public use yet and still missing a lot of stuff. I will clean this up later maybe. Please don't look at my backend spaghetti, I can do better but it works. please don't look at room.vue ok?

## todo
  - [ ] add queue
  - [ ] add synced volume
  - [ ] add display of who did what
  - [ ] actually fix volume

## changelog

15.02.2020
  - centered url input
  - improved sentry support

08.01.2020
  - Press F to fullscreen
  - Made volume progress bar feel a little more natural, but not quite fully.
  - Removed cases of unnecessary double-invocation of player.seekTo
  - Removed some backend spaghetti
  - You can now use /r/ instead of /room/. Actually /r/ is the default now.
  - Prevent video from starting wherever youtube wants. This is for longer videos that you've started watching on youtube already.