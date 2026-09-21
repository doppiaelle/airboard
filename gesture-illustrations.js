const ICONS = {
  pointer: `
    <svg viewBox="0 0 180 140" role="img" focusable="false">
      <g class="gesture-hand gesture-hand-pointer">
        <path class="hand-fill" d="M68 127c-13-7-21-20-21-35 0-12 6-22 16-28l12-7V23c0-10 7-18 17-18s18 8 18 18v40l7-5c8-6 19-4 25 4 5 7 5 16 0 23l-17 25c-8 12-21 20-36 20H79c-4 0-8-1-11-3Z"/>
        <path class="hand-fill" d="M67 65c-3-8 1-17 9-20 7-3 15 0 19 6l3 6c1-8 8-14 16-14 9 0 16 7 16 16v17H72l-5-11Z"/>
        <path class="hand-detail" d="M76 78c15-10 35-12 51-4M76 94h45M77 109h34M92 62V25"/>
      </g>
      <circle class="gesture-target" cx="92" cy="8" r="7"/>
      <path class="motion-line pointer-motion" d="M48 21h20M58 13l10 8-10 8"/>
    </svg>`,
  write: `
    <svg viewBox="0 0 180 140" role="img" focusable="false">
      <g class="gesture-hand gesture-hand-write">
        <path class="hand-fill" d="M91 41c15-16 41-17 57-3 12 11 19 27 18 43-1 26-22 47-48 48h-12c-17 0-30-12-30-28 0-9 4-17 11-22 7-6 10-13 8-22l-4-16Z"/>
        <path class="hand-stroke grip-index" d="M144 54c-18-14-39-13-55 0L58 78"/>
        <path class="hand-stroke grip-thumb" d="M146 98c-21 13-43 9-59-6L58 78"/>
        <path class="hand-stroke grip-fingers" d="M148 70c-16-7-31-3-43 9M148 84c-15-2-27 3-36 15"/>
        <path class="hand-detail" d="M103 111c12 3 25 0 34-8M103 47c10 0 19 4 27 10"/>
      </g>
      <circle class="finger-ring ring-index" cx="58" cy="78" r="8"/>
      <circle class="finger-ring ring-thumb" cx="58" cy="78" r="8"/>
      <path class="motion-line pinch-motion" d="m42 65 10 10m-7 10 10-4"/>
    </svg>`,
  release: `
    <svg viewBox="0 0 180 140" role="img" focusable="false">
      <g class="gesture-hand gesture-hand-release">
        <path class="hand-fill" d="M91 41c15-16 41-17 57-3 12 11 19 27 18 43-1 26-22 47-48 48h-12c-17 0-30-12-30-28 0-9 4-17 11-22 7-6 10-13 8-22l-4-16Z"/>
        <path class="hand-stroke release-grip-index" d="M144 54c-18-14-39-13-55 0L50 67"/>
        <path class="hand-stroke release-grip-thumb" d="M146 98c-21 13-43 9-59-6L64 97"/>
        <path class="hand-stroke grip-fingers" d="M148 70c-16-7-31-3-43 9M148 84c-15-2-27 3-36 15"/>
        <path class="hand-detail" d="M103 111c12 3 25 0 34-8M103 47c10 0 19 4 27 10"/>
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
