<p align="center">
  <a href="https://w2g.vaaski.com" target="_blank">
    <img src="https://w2g.vaaski.com/banner.png">
  </a>
</p>
<hr>

### Watch YouTube videos with your friends.

> I got annoyed by watch2gether.com, so I built this thing which is more simple and less cluttered. Not intended for public use yet and still missing a lot of stuff. I will clean this up later maybe. Please don't look at room.vue ok?

## how to use

- upon first visit you'll be redirected to [/signup](https://w2g.vaaski.com/signup) where you can set a display name.
- after that you can generate a new room by pressing the _new room_ button.
- you'll then be redirected to your room where you can **paste a url** and **click play** _or_ **right click** the input to paste & play a video (chrome only).
- feel free to share the url of your room to let other people join. people in the room are displayed on the top right corner.
- to queue a video to play after the current one, paste a url and **right click** the play button _or_ simply **shift right-click** the url input.
- to play a video from the queue, left click it. to remove a video from the queue simply right click it.
- to adjust volume, use the slider on the right to the video or the keyboard shortcuts.
- the current keyboard shortcuts are:

  | key              | function                    |
  | ---------------- | --------------------------- |
  | arrow right/left | skip 5s                     |
  | arrow up/down    | adjust volume by 5%         |
  | space            | play/pause the video        |
  | N                | play next video             |
  | Q or V           | toggle queue/volume display |
  | F                | toggle fullscreen           |
  | S                | focus the url bar           |
  | ESC              | unfocus the url bar         |

## todo

- [x] add queue
- [ ] add synced volume
- [ ] add display of who did what
- [ ] actually fix volume slider

## changelog

- 25.04.2020

  - added a queue feature
  - added usage instructions to readme

- 15.02.2020

  - centered url input
  - improved sentry support

- 08.01.2020

  - Press F to fullscreen
  - Made volume progress bar feel a little more natural, but not quite fully.
  - Removed cases of unnecessary double-invocation of player.seekTo
  - Removed some backend spaghetti
  - You can now use /r/ instead of /room/. Actually /r/ is the default now.
  - Prevent video from starting wherever youtube wants. This is for longer videos that you've started watching on youtube already.
