const MOTION_CUES = {
  pointer: `
    <svg class="gesture-motion-svg" viewBox="0 0 180 140" focusable="false">
      <circle class="gesture-cue-dot pointer-target" cx="89" cy="12" r="6"/>
      <path class="gesture-cue pointer-cue" d="M38 24h25m-9-9 9 9-9 9"/>
    </svg>`,
  write: `
    <svg class="gesture-motion-svg" viewBox="0 0 180 140" focusable="false">
      <circle class="gesture-cue-dot write-target" cx="43" cy="80" r="5"/>
      <path class="gesture-cue write-cue write-cue-top" d="m25 63 12 11"/>
      <path class="gesture-cue write-cue write-cue-bottom" d="m26 97 12-11"/>
    </svg>`,
  release: `
    <svg class="gesture-motion-svg" viewBox="0 0 180 140" focusable="false">
      <circle class="gesture-cue-dot release-target release-target-index" cx="50" cy="27" r="5"/>
      <circle class="gesture-cue-dot release-target release-target-thumb" cx="45" cy="103" r="5"/>
      <path class="gesture-cue release-arc" d="M36 31C23 49 22 79 35 99m-7-7 7 7 3-10"/>
    </svg>`,
  erase: `
    <svg class="gesture-motion-svg" viewBox="0 0 180 140" focusable="false">
      <path class="gesture-cue erase-cue erase-cue-left" d="M24 70h31"/>
      <path class="gesture-cue erase-cue erase-cue-right" d="M126 70h31"/>
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
    const requested = this.getAttribute("gesture") || "pointer";
    const gesture = MOTION_CUES[requested] ? requested : "pointer";
    this.dataset.gesture = gesture;
    this.innerHTML = `
      <span class="gesture-hand-art"></span>
      ${MOTION_CUES[gesture]}
    `;
    this.setAttribute("aria-hidden", "true");
  }
}

if (!customElements.get("gesture-illustration"))
  customElements.define("gesture-illustration", GestureIllustration);
