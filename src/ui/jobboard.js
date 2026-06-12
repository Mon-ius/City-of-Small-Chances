// The work board (book §9). Lists the jobs offered in the district you're standing
// in: each shows its family, hours, a pay estimate, your mastery, and either a
// "Start shift" button (→ the shift scene) or the reason it's out of reach right
// now (wrong place, closed window, not qualified, no time). Honest gating per the
// book's "explain uncertainty" rule.

import { el } from "./dom.js";
import { listLocalJobs, MASTERY_MAX } from "../systems/jobs.js";
import { JOB_FAMILIES } from "../data/jobs.js";

// `onStart(jobId)` opens the shift scene for an available job.
export function renderJobBoard(state, onStart) {
  const jobs = listLocalJobs(state);

  const head = el("div.panel__head", {}, [
    el("h3", { text: "Work board" }),
    el("span.panel__hint", { text: jobs.length ? "Shifts offered here" : "No work posted here" }),
  ]);

  if (!jobs.length) {
    return el("div.panel.jobboard", {}, [
      head,
      el("p.jobboard__empty", { text: "Nothing's hiring in this district. Try the market, the harbour, the yards, or the civic quarter." }),
    ]);
  }

  const rows = jobs.map((st) => {
    const job = st.job;
    const fam = JOB_FAMILIES[job.family] || { label: job.family, color: "#c9803f" };
    const stars = "★".repeat(st.mastery.level) + "☆".repeat(MASTERY_MAX - st.mastery.level);

    const cta = st.available
      ? el("button.jobcard__go", { onClick: () => onStart(job.id), title: job.blurb }, [
          el("span", { text: st.canAuto ? "Work / auto ▸" : "Start shift ▸" }),
        ])
      : el("span.jobcard__locked", { text: st.reason });

    return el("div.jobcard" + (st.available ? "" : ".jobcard--off"), { style: `--fam:${fam.color}` }, [
      el("div.jobcard__top", {}, [
        el("span.jobcard__icon", { text: job.icon }),
        el("div.jobcard__id", {}, [
          el("div.jobcard__name", { text: job.name }),
          el("div.jobcard__meta", {}, [
            el("span.jobcard__fam", { text: fam.label }),
            el("span.jobcard__hours", { text: st.window }),
          ]),
        ]),
        el("div.jobcard__pay", {}, [
          el("span.jobcard__paynum", { text: `$${st.payLo}–${st.payHi}` }),
          el("span.jobcard__paysub", { text: `${job.minutes}m` }),
        ]),
      ]),
      el("div.jobcard__bottom", {}, [
        el("span.jobcard__stars", { text: stars, title: `Mastery ${st.mastery.level}/${MASTERY_MAX} · ${st.mastery.shifts} shift${st.mastery.shifts === 1 ? "" : "s"}` }),
        cta,
      ]),
    ]);
  });

  return el("div.panel.jobboard", {}, [head, el("div.jobboard__list", {}, rows)]);
}
