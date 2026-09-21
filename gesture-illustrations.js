const ICONS = {
  pointer: `
    <svg viewBox="0 0 180 140" role="img" focusable="false">
      <g class="gesture-hand gesture-hand-pointer">
        <path class="hand-fill" d="M72 126c-13-8-21-23-21-39V69c0-7 10-9 13-3l5 10V29c0-10 15-10 15 0v30-39c0-10 15-10 15 0v39-30c0-10 15-10 15 0v33-21c0-10 15-10 15 0v38l7-10c5-7 16-1 12 7l-18 37c-5 10-15 17-27 17H86c-5 0-10-1-14-4Z"/>
        <path class="hand-detail" d="M69 76c7 9 10 17 10 27M84 59v30M99 59v30M114 62v27"/>
      </g>
      <circle class="gesture-target" cx="91.5" cy="12" r="7"/>
      <path class="motion-line pointer-motion" d="M49 18h24M61 10l12 8-12 8"/>
    </svg>`,
  write: `
    <svg viewBox="0 0 180 140" role="img" focusable="false">
      <g class="gesture-hand gesture-hand-write">
        <path class="hand-fill" d="M69 126c-15-8-23-23-23-40V70c0-8 10-10 14-3l8 15 1-41c0-9 14-10 15-1l2 26 8-37c2-9 16-6 14 3l-6 35 13-25c4-8 17-3 13 6l-10 25 14-13c7-6 16 4 10 11l-18 20c-6 7-9 14-11 23-2 9-10 16-20 16H84c-5 0-10-1-15-4Z"/>
        <path class="hand-detail" d="M68 82c8 7 13 15 15 25M86 66l2 20M102 67l-3 20M118 73l-6 18"/>
      </g>
      <circle class="finger-ring ring-index" cx="84" cy="39" r="9"/>
      <circle class="finger-ring ring-thumb" cx="132" cy="60" r="9"/>
      <path class="motion-line pinch-motion" d="M96 45l10 5M120 55l-10-4"/>
    </svg>`,
  release: `
    <svg viewBox="0 0 180 140" role="img" focusable="false">
      <g class="gesture-hand gesture-hand-release">
        <path class="hand-fill" d="M70 126c-14-8-22-23-22-39V70c0-8 10-10 14-3l7 14V38c0-10 15-10 15 0v28l10-39c2-9 16-6 14 3l-8 38 17-28c5-8 17-1 12 7l-14 27 18-15c7-6 16 5 9 12l-20 20c-6 6-9 14-11 23-2 9-10 16-20 16H85c-5 0-10-1-15-4Z"/>
        <path class="hand-detail" d="M69 81c8 8 12 16 14 26M84 66l2 21M100 68l-4 19M115 74l-7 17"/>
      </g>
      <circle class="finger-ring release-index" cx="76" cy="34" r="8"/>
      <circle class="finger-ring release-thumb" cx="139" cy="58" r="8"/>
      <path class="motion-line release-left" d="M68 28 54 22M58 15l-4 7 7 3"/>
      <path class="motion-line release-right" d="m147 51 14-7m-4-6 4 6-6 3"/>
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
