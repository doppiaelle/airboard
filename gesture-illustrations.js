const ICONS = {
  pointer: `
    <svg viewBox="0 0 180 140" role="img" focusable="false">
      <g class="gesture-hand gesture-hand-pointer">
        <path class="hand-silhouette" d="M58 77c8-14 22-22 39-22h17c10 0 18 8 18 18 9 0 16 7 16 16 0 7-3 13-7 19l-10 13c-6 8-16 13-27 13H82c-18 0-33-15-33-33 0-10 3-18 9-24Z"/>
        <path class="hand-stroke-outline" d="M88 76V24"/>
        <path class="hand-stroke pointer-index" d="M88 76V24"/>
        <path class="hand-stroke-outline" d="M101 69c10-8 24-5 29 5M106 84h29M104 99h27"/>
        <path class="hand-stroke curled-fingers" d="M101 69c10-8 24-5 29 5M106 84h29M104 99h27"/>
        <path class="hand-stroke-outline" d="M61 78c4 15 17 26 34 28"/>
        <path class="hand-stroke pointer-thumb" d="M61 78c4 15 17 26 34 28"/>
        <path class="hand-detail" d="M73 116c12 5 28 5 41 0M97 57v19"/>
      </g>
      <circle class="gesture-target" cx="88" cy="8" r="7"/>
      <path class="motion-line pointer-motion" d="M45 22h20M55 14l10 8-10 8"/>
    </svg>`,
  write: `
    <svg viewBox="0 0 180 140" role="img" focusable="false">
      <g class="gesture-hand gesture-hand-write">
        <path class="hand-silhouette" d="M104 39c13-9 31-7 43 4 14 13 21 34 17 53-5 21-23 35-45 35h-13c-17 0-29-11-29-26 0-9 5-17 13-22 9-6 13-15 12-26l2-18Z"/>
        <g class="grip-index">
          <path class="hand-stroke-outline" d="M145 55c-17-15-39-16-56-3L58 78"/>
          <path class="hand-stroke" d="M145 55c-17-15-39-16-56-3L58 78"/>
        </g>
        <g class="grip-thumb">
          <path class="hand-stroke-outline" d="M146 101c-21 12-43 8-59-7L58 78"/>
          <path class="hand-stroke" d="M146 101c-21 12-43 8-59-7L58 78"/>
        </g>
        <path class="hand-stroke-outline" d="M150 72c-16-8-32-5-44 7M150 87c-14-3-27 2-37 14"/>
        <path class="hand-stroke grip-fingers" d="M150 72c-16-8-32-5-44 7M150 87c-14-3-27 2-37 14"/>
        <path class="hand-detail" d="M104 113c12 3 25 0 34-8M108 46c10-1 20 3 28 10M113 82c9-4 19-4 28-1"/>
      </g>
      <circle class="finger-ring ring-index" cx="58" cy="78" r="8"/>
      <circle class="finger-ring ring-thumb" cx="58" cy="78" r="8"/>
      <path class="motion-line pinch-motion" d="m42 65 10 10m-7 10 10-4"/>
    </svg>`,
  release: `
    <svg viewBox="0 0 180 140" role="img" focusable="false">
      <g class="gesture-hand gesture-hand-release">
        <path class="hand-silhouette" d="M104 39c13-9 31-7 43 4 14 13 21 34 17 53-5 21-23 35-45 35h-13c-17 0-29-11-29-26 0-9 5-17 13-22 9-6 13-15 12-26l2-18Z"/>
        <g class="release-grip-index">
          <path class="hand-stroke-outline" d="M145 55c-17-15-39-16-56-3L50 67"/>
          <path class="hand-stroke" d="M145 55c-17-15-39-16-56-3L50 67"/>
        </g>
        <g class="release-grip-thumb">
          <path class="hand-stroke-outline" d="M146 101c-21 12-43 8-59-7L64 97"/>
          <path class="hand-stroke" d="M146 101c-21 12-43 8-59-7L64 97"/>
        </g>
        <path class="hand-stroke-outline" d="M150 72c-16-8-32-5-44 7M150 87c-14-3-27 2-37 14"/>
        <path class="hand-stroke grip-fingers" d="M150 72c-16-8-32-5-44 7M150 87c-14-3-27 2-37 14"/>
        <path class="hand-detail" d="M104 113c12 3 25 0 34-8M108 46c10-1 20 3 28 10M113 82c9-4 19-4 28-1"/>
      </g>
      <circle class="finger-ring release-index" cx="50" cy="67" r="8"/>
      <circle class="finger-ring release-thumb" cx="64" cy="97" r="8"/>
      <path class="motion-line release-left" d="m44 56-9-10m-2 8 2-8 8 2"/>
      <path class="motion-line release-right" d="m71 104 9 10m2-8-2 8-8-2"/>
    </svg>`,
  erase: `
    <svg viewBox="0 0 180 140" role="img" focusable="false">
      <g class="gesture-hand gesture-hand-erase">
        <path class="hand-fill" d="M64 125c-13-10-20-25-20-42V61c0-9 13-11 16-2l6 18V28c0-10 15-10 15 0v38-47c0-10 15-10 15 0v47-41c0-10 15-10 15 0v42-31c0-10 15-10 15 0v44l9-12c6-8 18 1 12 9l-18 30c-7 13-20 21-35 21H78c-5 0-10-1-14-3Z"/>
        <path class="hand-detail" d="M66 77v25M81 66v34M96 66v34M111 67v33"/>
      </g>
      <path class="erase-trail erase-trail-one" d="M27 45h26"/>
      <path class="erase-trail erase-trail-two" d="M127 45h26"/>
    </svg>`,
};

class GestureIllustration extends HTMLElement {
  static observedAttributes = ["gesture"];

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const gesture = this.getAttribute("gesture") || "pointer";
    this.dataset.gesture = gesture;
    this.innerHTML = ICONS[gesture] || ICONS.pointer;
    this.setAttribute("aria-hidden", "true");
  }
}

if (!customElements.get("gesture-illustration"))
  customElements.define("gesture-illustration", GestureIllustration);
