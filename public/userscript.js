// ==UserScript==
// @name         w2g extended
// @namespace    https://w2g.vaaski.com
// @version      0.1
// @description  extended controls for https://w2g.vaaski.com
// @author       You
// @match        https://*.youtube.com/*
// @grant        none
// ==/UserScript==


// todo make addedText work on moving thumbnails
// todo replace youtube logo
!(async () => {
  "use strict"
  if (/\/embed\//gi.exec(window.location.href)) return

  console.log("w2g extended")
  try {
    const wait = t => new Promise(r => setTimeout(r, t))
    const iframe = document.createElement("iframe")
    iframe.src = "https://w2g.vaaski.com/iframe"
    document.body.appendChild(iframe)

    document.body.oncontextmenu = async e => {
      const video = e.target.closest(
        "ytd-grid-video-renderer, ytd-rich-item-renderer"
      )

      if (!video) return
      e.preventDefault()
      const url = video.querySelector("#thumbnail").href

      iframe.contentWindow.postMessage(
        {
          type: "w2g",
          action: "addqueue",
          url,
        },
        "*"
      )

      const added = document.createElement("div")
      const addedText = document.createElement("div")
      addedText.innerText = "added"
      added.setAttribute(
        "style",
        "font-size:32px;position:absolute;height:100%;width:100%;top:0;left:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);transition:100ms;opacity:0"
      )
      added.appendChild(addedText)
      video.querySelector("yt-img-shadow").appendChild(added)

      await wait(100)
      added.style.opacity = 1
      await wait(1000)
      added.style.opacity = 0
      await wait(100)
      added.remove()
    }
  } catch (e) {
    console.log(e)
  }
})()
