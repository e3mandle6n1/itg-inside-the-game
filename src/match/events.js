import { EVENT_LABELS, EVENT_ICONS, SITOVER_TYPES, HIGHLIGHT_SITOVER } from "./constants.js";
import { cardColour, clampPitch } from "./util.js";
import { isShootoutPeriod, isShootoutPeriodStart } from "./shootout.js";

export function hasSitover(event) {
  const type = event?.incident || event?.type;
  if (!type) return false;
  if (event?.phase != null && event?.incident) return HIGHLIGHT_SITOVER.has(type);
  return SITOVER_TYPES.has(type);
}

export function isCardEvent(event) {
  const kind = event?.incident || event?.type;
  return kind === "card";
}

export function isShootoutGoal(event) {
  if (!event) return false;
  const kind = event.incident || event.type;
  if (kind !== "goal") return false;
  return isShootoutPeriod(event);
}

export function cardSpot(event) {
  if (!isCardEvent(event)) return null;
  if (event?.x != null && event?.y != null) {
    return { x: clampPitch(event.x), y: clampPitch(event.y) };
  }
  return { x: event?.team === "away" ? 58 : 42, y: 50 };
}

export function incidentTitle(event) {
  if (!event) return "";
  const kind = event.incident || event.type;
  if (kind === "card") {
    const colour = cardColour(event);
    if (colour === "red") return "Red card";
    if (colour === "yellowred") return "Second yellow";
    return "Yellow card";
  }
  return EVENT_LABELS[kind] || kind;
}

export function holdFor(event) {
  if (!event) return 280;
  const kind = event.incident || event.type;
  switch (kind) {
    case "goal":
      return 3400;
    case "card":
      if (event.withFreeKick) return 2800;
      return cardColour(event) === "yellowred" ? 2400 : 1700;
    case "substitution":
      return 2600;
    case "injury":
      return 2000;
    case "shotontarget":
    case "shotofftarget":
      return 2000;
    case "shotblocked":
      return 1800;
    case "goalkeeper_saved":
      return 1800;
    case "freekick":
    case "freekick_taken":
      return 900;
    case "offside":
      return 1600;
    case "corner":
      return 900;
    case "throwin":
      return 2000;
    case "goal_kick":
      return 1100;
    case "match_action":
      return 320;
    case "kickoff":
      return 1800;
    case "periodstart": {
      if (isShootoutPeriodStart(event)) return 4200;
      const clock = String(event.clock || event.text || "");
      const opening = /1st|first/i.test(clock)
        || ((event.minute ?? 0) === 0 && !/2nd|second/i.test(clock));
      return opening ? 4200 : 1600;
    }
    case "periodscore":
    case "match_ended":
      return 700;
    default:
      return 320;
  }
}

export function iconFor(event) {
  const type = event?.incident || event?.type;
  if (type === "card") {
    const colour = cardColour(event);
    if (colour === "red" || colour === "yellowred") return "red-card";
    return "yellow-card";
  }
  return EVENT_ICONS[type] || "period";
}

export function momentumIcon(mark) {
  if (mark.type === "goal") return "goal";
  if (mark.type === "substitution") return "substitution";
  if (mark.type === "card") {
    const colour = cardColour(mark);
    return colour === "yellow" ? "yellow-card" : "red-card";
  }
  return mark.card === "red" ? "red-card" : "yellow-card";
}
