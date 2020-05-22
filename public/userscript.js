// ==UserScript==
// @name         w2g extended
// @namespace    https://w2g.vaaski.com
// @version      0.2
// @description  extended controls for https://w2g.vaaski.com
// @author       You
// @match        https://*.youtube.com/*
// @grant        none
// ==/UserScript==

!(async () => {
  "use strict"
  if (/\/embed\//gi.exec(window.location.href)) return

  console.log("w2g extended")
  try {
    const wait = t => new Promise(r => setTimeout(r, t))
    const iframe = document.createElement("iframe")
    iframe.src = "https://w2g.vaaski.com/iframe"
    document.body.appendChild(iframe)

    const logoStyles = document.createElement("style")
    logoStyles.innerText =
      "@font-face{src:url('https://w2g.vaaski.com/corporation_games.ttf');font-family:corporation_games}#logo.ytd-topbar-logo-renderer,#country-code.ytd-topbar-logo-renderer{display:none}"
    document.body.appendChild(logoStyles)
    const w2glogo = document.createElement("div")
    w2glogo.innerText = "W2G"
    w2glogo.setAttribute(
      "style",
      "color:#FFF;font-size:32px;font-family:corporation_games;"
    )
    document.querySelector("ytd-topbar-logo-renderer#logo").appendChild(w2glogo)

    document.body.oncontextmenu = async e => {
      const video = e.target.closest(
        "ytd-grid-video-renderer,ytd-rich-item-renderer,ytd-video-renderer"
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
        "color:#fff;font-size:32px;position:absolute;height:100%;width:100%;top:0;left:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);transition:100ms;opacity:0"
      )
      added.appendChild(addedText)
      video.querySelector("ytd-thumbnail").appendChild(added)

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
