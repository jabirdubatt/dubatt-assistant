/*! Dubatt Website Assistant widget. Embed with:
 *  <script src="https://<your-deployment>/widget.js" defer></script>
 *  Optional attributes: data-open="true" (open on load), data-privacy-url="https://www.dubatt.com/privacy"
 */
(() => {
"use strict";
if (window.__dubattAssistant) return;
window.__dubattAssistant = true;

const SCRIPT = document.currentScript || document.querySelector('script[src*="widget.js"]');
const API = SCRIPT ? new URL(SCRIPT.src, location.href).origin : location.origin;
const OPEN_ON_LOAD = SCRIPT && SCRIPT.dataset.open === "true";
const PRIVACY_URL = SCRIPT && SCRIPT.dataset.privacyUrl;

/* ---------- Content ---------- */
const HOURS = "working days, until 6 pm";
const PLANT = "Plot 5330295, Chemical Zone, Dubai Industrial City, Saih Shuaib 4, Dubai";

const CONTACT_BASE = [
  { k: "name", l: "Full name", t: "text", req: true, ac: "name" },
  { k: "company", l: "Company", t: "text", req: false, ac: "organization" },
  { k: "email", l: "Email", t: "email", req: true, ac: "email" },
  { k: "phone", l: "Mobile / WhatsApp (with country code)", t: "tel", req: true, ac: "tel" },
  { k: "country", l: "Country (and emirate, if UAE)", t: "text", req: true, ac: "country-name" }
];
const CONSENT = "I agree that Dubatt may store and use these details to respond to my enquiry, as set out in its privacy notice.";

const isULAB = c => c.material === "ulab";
const isFree = c => isULAB(c) && c.quantity === "small" && (c.weight === "under" || c.weight === "unsure");
const PAID_NOTE = "For more than 10 batteries or over 150 kg in total, Dubatt buys the material. Send your enquiry and our team will reply with an offer.";
const FREE_NOTE = "Good news: up to 10 lead-acid batteries weighing 150 kg or less in total can be dropped at our plant free of charge. Dubatt will email you a recycling certificate.";
const EW_NOTE = "We accept mobile phones, computers, cables, wires and similar items free of charge.";

const FLOWS = {
  buy: {
    label: "Buy from Dubatt", team: "sales team",
    intro: "Great. A few quick questions so our sales team can quote accurately.",
    steps: [
      { type: "choice", key: "product", ask: "Which product are you interested in?", options: [
        { v: "pure", l: "Pure lead ingots (99.97–99.985%)", note: "Every batch is tested in our in-house spectro lab." },
        { v: "alloy", l: "Lead alloys (calcium, tin, antimony, selenium, custom)", note: "We make alloys to your specification and test every batch in our in-house spectro lab." },
        { v: "pp", l: "PP polypropylene chips", note: "Supplied in jumbo bags, about 23–25 MT per 40ft HC container." },
        { v: "cast", l: "Lead filling, ballast or cast components" },
        { v: "chem", l: "Smelting chemicals or soda ash", note: "Chemicals are supplied only to approved industrial users, subject to authority approvals." },
        { v: "coal", l: "Anthracite coal", note: "Fixed carbon 90%+, sulphur below 1%." },
        { v: "byp", l: "Gypsum, lead slag or dilute acid", note: "These by-products are supplied within the UAE only." }
      ]},
      { type: "text", key: "spec", optional: true, when: c => c.product === "pure" || c.product === "alloy",
        ask: "Do you have a specification or grade? For example a Pb-Ca-Sn composition, a standard, or your internal grade code. Type it, or tap Skip.", placeholder: "e.g. Pb-Ca 0.08% Sn 0.6%" },
      { type: "text", key: "project", when: c => c.product === "cast",
        ask: "Briefly describe the job: application, approximate weight, and dimensions or drawings you have.", placeholder: "e.g. 12 t ballast blocks for a vessel" },
      { type: "text", key: "item", when: c => c.product === "chem" || c.product === "byp",
        ask: "Which item exactly, and what is it for?", placeholder: "e.g. caustic soda flakes for refining" },
      { type: "choice", key: "quantity", when: c => c.product !== "cast", ask: "Roughly how much do you need?", options: [
        { v: "trial", l: "Trial or sample lot" }, { v: "lt25", l: "Up to 25 MT a month" }, { v: "25-100", l: "25–100 MT a month" },
        { v: "100-500", l: "100–500 MT a month" }, { v: "500+", l: "Over 500 MT a month" }, { v: "spot", l: "One-off spot order" }
      ]},
      { type: "choice", key: "incoterm", when: c => c.product !== "byp", ask: "How should it be delivered?", options: [
        { v: "EXW", l: "Collect from our Dubai plant (EXW)" }, { v: "CIF", l: "Shipped to your port (CIF)" },
        { v: "DDP", l: "Delivered to your facility (DDP)" }, { v: "tbd", l: "Not sure yet" }
      ]},
      { type: "text", key: "destination", ask: "Which country and city is it for?", placeholder: "e.g. Muscat, Oman" },
      { type: "contact", fields: CONTACT_BASE.map(f => f.k === "company" ? { ...f, req: true } : f) }
    ],
    after: "Prices and lead times are quoted by our sales team for each enquiry."
  },
  sell: {
    label: "Sell us scrap batteries", team: "battery procurement team",
    intro: "Thanks for choosing to recycle with us. Tell me what you have and our procurement team will come back to you.",
    steps: [
      { type: "choice", key: "seller", ask: "Who are you selling as?", options: [
        { v: "individual", l: "Individual" }, { v: "workshop", l: "Garage, workshop or battery shop" },
        { v: "company", l: "Company or fleet with used batteries" }, { v: "trader", l: "Scrap trader or collector" },
        { v: "gov", l: "Government entity or large organisation" }
      ]},
      { type: "choice", key: "material", ask: "What do you have?", options: [
        { v: "ulab", l: "Used lead-acid batteries (car, truck, UPS, forklift, telecom)" },
        { v: "leadscrap", l: "Lead scrap, dross or other lead-bearing material" },
        { v: "li", l: "Lithium-ion or Ni-Cd batteries", warn: true, note: "Lithium-ion and Ni-Cd batteries are chargeable. We arrange their safe, approved disposal through licensed partners and charge a processing fee, which our team quotes based on battery type and quantity." },
        { v: "ewaste", l: "Electronic waste (phones, computers, cables)" }
      ]},
      { type: "choice", key: "ewasteType", when: c => c.material === "ewaste", ask: "What kind of electronic waste?", options: [
        { v: "phones", l: "Mobile phones", note: EW_NOTE }, { v: "computers", l: "Computers and laptops", note: EW_NOTE },
        { v: "cables", l: "Cables and wires", note: EW_NOTE }, { v: "mixed", l: "A mix of these", note: EW_NOTE },
        { v: "appliances", l: "TVs, washing machines, fridges or other appliances", stop: true, warn: true,
          note: "We don't accept TVs, washing machines, fridges or other household appliances. Please contact a licensed e-waste recycler for these." }
      ]},
      { type: "choice", key: "quantity", when: isULAB, ask: "How many batteries do you have?", options: [
        { v: "small", l: "1–10 batteries" },
        { v: "11-50", l: "11–50 batteries", note: PAID_NOTE }, { v: "50+", l: "More than 50 batteries", note: PAID_NOTE },
        { v: "1-10t", l: "1–10 MT", note: PAID_NOTE }, { v: "10t+", l: "Over 10 MT", note: PAID_NOTE },
        { v: "monthly", l: "Regular monthly supply", note: PAID_NOTE }
      ]},
      { type: "choice", key: "weight", when: c => isULAB(c) && c.quantity === "small",
        ask: "Is their total weight over 150 kg? Car batteries are usually 12–25 kg each; truck, UPS and forklift batteries can be much heavier.", options: [
        { v: "under", l: "No, 150 kg or less", note: FREE_NOTE },
        { v: "over", l: "Yes, over 150 kg", note: PAID_NOTE },
        { v: "unsure", l: "Not sure", note: "No problem. For 10 batteries or fewer we treat the total as under 150 kg, so they qualify for free drop-off and a recycling certificate." }
      ]},
      { type: "choice", key: "quantity", when: c => !isULAB(c), ask: "Approximate quantity?", options: [
        { v: "few", l: "Just a few items" }, { v: "lt1", l: "Under 1 MT" }, { v: "1-10", l: "1–10 MT" }, { v: "10-50", l: "10–50 MT" },
        { v: "50+", l: "Over 50 MT" }, { v: "monthly", l: "Regular monthly supply" }
      ]},
      { type: "choice", key: "dropoff", when: isFree, ask: "Can you bring them to our plant in Dubai Industrial City?", options: [
        { v: "yes", l: "Yes, I'll bring them", note: `Our plant: ${PLANT}. We receive batteries on ${HOURS}. Factory: +971 4 4366522.` },
        { v: "no", l: "No, I need them collected", warn: true, note: "Free acceptance applies when the batteries are brought to our plant. Our team will contact you about collection options." }
      ]},
      { type: "choice", key: "location", when: c => !isFree(c), ask: "Where is the material?", options: [
        { v: "dxb", l: "Dubai" }, { v: "auh", l: "Abu Dhabi" }, { v: "nor", l: "Sharjah, Ajman or UAQ" },
        { v: "rak", l: "Ras Al Khaimah or Fujairah" },
        { v: "intl", l: "Outside the UAE", warn: true, note: "Used batteries crossing borders are hazardous waste. Basel Convention procedures and UAE import permits must be in place before anything ships. Our team will guide you." }
      ]},
      { type: "choice", key: "collection", when: c => !isFree(c) && c.location !== "intl", ask: "Should we collect it?", options: [
        { v: "collect", l: "Yes, please collect", note: "We run our own hazardous waste transport under Dubai Municipality permits, RASID and RTA approvals." },
        { v: "deliver", l: "I'll deliver to the plant" }
      ]},
      { type: "contact", fields: CONTACT_BASE.map(f => f.k === "name" ? { ...f, l: "Full name (as it should appear on any certificate)" } : f.k === "company" ? { ...f, l: "Company (leave blank if individual)" } : f) }
    ],
    typeFor: c => isFree(c) ? "Small-quantity drop-off (free, with certificate)"
      : c.material === "li" ? "Lithium / Ni-Cd disposal (chargeable)"
      : c.material === "ewaste" ? "E-waste (accepted free of charge)"
      : "Sell us scrap batteries",
    done: (c, ref, contact, first) => isFree(c)
      ? `Thank you${first ? ", " + first : ""}. Your reference is ${ref}. Bring the batteries to our plant at ${PLANT} (${HOURS}) and quote this reference at the gate. We'll accept them free of charge, and Dubatt will email your recycling certificate to ${contact.email}.`
      : null,
    after: c => isFree(c)
      ? "Free acceptance and the certificate apply to lead-acid batteries only, up to 10 pieces with a total weight of 150 kg or less."
      : isULAB(c)
        ? "For more than 10 batteries or over 150 kg in total, Dubatt buys the material. The team will reply with an offer based on battery type, quantity, condition and location."
        : c.material === "li"
          ? "Our team will send you a quote for the processing and disposal fee. Nothing is charged until you accept it."
          : c.material === "ewaste"
            ? `Electronic waste is accepted free of charge. Our team will confirm the items and the hand-over. We receive material on ${HOURS}.`
            : "Our team will reply with an offer for your lead-bearing material."
  },
  supply: {
    label: "Supply to Dubatt", team: "purchasing team",
    intro: "Thanks for your interest in supplying Dubatt. Let me take a few details for our purchasing team.",
    steps: [
      { type: "choice", key: "category", ask: "What do you supply?", options: [
        { v: "chem", l: "Chemicals and fluxes" }, { v: "alloying", l: "Alloying metals (tin, calcium, antimony, selenium, aluminium)" },
        { v: "fuel", l: "Fuels and reductants" }, { v: "refr", l: "Refractories and plant consumables" },
        { v: "equip", l: "Equipment, machinery or spares" }, { v: "svc", l: "Services (logistics, maintenance, testing, waste)" },
        { v: "other", l: "Something else" }
      ]},
      { type: "text", key: "items", ask: "Which products or services, specifically? Include grades, origin and typical lot sizes if you can.", placeholder: "e.g. Tin ingots 99.9%, Indonesia, 5 MT lots" },
      { type: "choice", key: "documents", ask: "Can you provide technical documents (TDS, SDS, certificates of analysis, ISO certificates)?", options: [
        { v: "all", l: "Yes, all of them" }, { v: "some", l: "Some of them" }, { v: "no", l: "Not yet" }
      ]},
      { type: "choice", key: "base", ask: "Where is your company based?", options: [
        { v: "uae", l: "UAE" }, { v: "gcc", l: "Elsewhere in the GCC" }, { v: "intl", l: "Outside the GCC" }
      ], noteAfter: "Approved suppliers are registered through our counterparty (KYS) and UAE e-invoicing form, which purchasing will send you." },
      { type: "contact", fields: CONTACT_BASE.map(f => f.k === "company" ? { ...f, req: true } : f) }
    ],
    after: "Purchasing reviews new suppliers against current requirements and contacts shortlisted companies."
  },
  jobs: {
    label: "Careers and CV", team: "HR team",
    intro: "Thanks for your interest in working at Dubatt. We don't list vacancies here, so your CV goes to our HR team, who match it against current and upcoming roles.",
    notice: { warn: true, text: "Dubatt never charges candidates a fee and never asks for payment for a job or visa. Report any such request to hello@dubatt.com." },
    steps: [
      { type: "choice", key: "function", ask: "Which area fits you best?", options: [
        { v: "ops", l: "Plant operations (battery breaking, smelting, refining)" }, { v: "maint", l: "Maintenance (mechanical, electrical, instrumentation)" },
        { v: "qa", l: "QA/QC and laboratory" }, { v: "hse", l: "Health, safety and environment" },
        { v: "logistics", l: "Logistics and driving (incl. hazardous goods)" }, { v: "commercial", l: "Sales, procurement or supply chain" },
        { v: "support", l: "Finance, HR, admin or IT" }, { v: "other", l: "Other" }
      ]},
      { type: "choice", key: "experience", ask: "Years of relevant experience?", options: [
        { v: "0-1", l: "0–1 (fresher)" }, { v: "1-3", l: "1–3" }, { v: "3-7", l: "3–7" }, { v: "7-15", l: "7–15" }, { v: "15+", l: "15+" }
      ]},
      { type: "choice", key: "location", ask: "Where are you now?", options: [ { v: "uae", l: "In the UAE" }, { v: "intl", l: "Outside the UAE" } ] },
      { type: "file", key: "cv", ask: "Attach your CV (PDF or Word, up to 4 MB)." },
      { type: "text", key: "linkedin", optional: true, ask: "LinkedIn profile link (optional). Paste it, or tap Skip.", placeholder: "linkedin.com/in/…" },
      { type: "contact", consent: "I agree that Dubatt may store my details and CV to consider me for current and future roles for up to 12 months, as set out in its privacy notice.",
        fields: CONTACT_BASE.filter(f => f.k !== "company").map(f => f.k === "country" ? { ...f, l: "Current city and country" } : f) }
    ],
    after: "HR contacts candidates whose profiles match an open or upcoming role."
  },
  info: {
    label: "Research and media requests", team: "communications team",
    intro: "Tell me what you need and our communications team will come back to you.",
    steps: [
      { type: "choice", key: "purpose", ask: "What is the request for?", options: [
        { v: "academic", l: "Academic research or thesis" }, { v: "media", l: "Press or media interview" },
        { v: "visit", l: "Plant visit (school, university, delegation)" }, { v: "data", l: "Sustainability or ESG data" },
        { v: "other", l: "Something else" }
      ]},
      { type: "text", key: "request", ask: "Describe what you need and any deadline.", placeholder: "e.g. Annual ULAB volumes for a thesis, needed by 30 Nov" },
      { type: "contact", fields: CONTACT_BASE.map(f => f.k === "company" ? { ...f, l: "Organisation" } : f) }
    ],
    after: "Some data may be shared only under agreed terms."
  }
};

const TOPICS = [
  { v: "process", l: "How battery recycling works", a: "Used batteries arrive at our plant in Dubai Industrial City, where they are broken and separated into three streams.\n\nLead paste and grids are smelted and refined into pure lead and lead alloy ingots, checked in our in-house spectro lab. Plastic casings are washed and ground into polypropylene chips. Battery acid is neutralised, which produces gypsum.\n\nWe recover up to 95% of the lead-bearing material, and the lead goes back into new batteries." },
  { v: "env", l: "Environmental benefits", a: "Industry figures for lead-acid battery recycling, compared with producing lead from ore:\n\nAbout 1.65 tonnes of CO2 avoided per tonne of batteries recycled.\nUp to 75% less energy.\nRoughly half the sulphur dioxide and particulate emissions.\n\nRecycling also keeps acid and heavy metals out of landfill, soil and water. More at dubatt.com/sustainability." },
  { v: "certs", l: "Certifications and permits", a: "Dubatt holds ISO 9001:2015 (quality), ISO 14001:2015 (environment) and ISO 45001:2018 (health and safety), an In-Country Value (ICV) certificate, Environmental Clearance and a Dubai Municipality NOC.\n\nOur transport fleet operates under Dubai Municipality hazardous waste transport permits, RASID permits and RTA approvals." },
  { v: "facts", l: "Plant capacity and key facts", a: "Our plant in Dubai Industrial City covers about 254,000 sq ft, with 70,000 sq ft built up, and uses Italian recycling technology.\n\nIt can process up to 50,000 MT of used lead-acid batteries a year and produce up to 25,000 MT of pure lead and lead alloys and 3,500 MT of polypropylene chips a year. The plant opened in February 2024." },
  { v: "news", l: "Dubatt in the news", a: "The plant's opening in February 2024 was covered by Gulf Today, Zawya, Al Khaleej, Al Bayan and others. In November 2024, du launched a lead-acid battery recycling initiative with Dubatt.\n\nThe full press list is at dubatt.com/media." }
];

const FAQ = [
  { k: ["certificate", "free", "drop", "one battery", "car battery", "few batteries", "شهادة"], a: "You can bring up to 10 lead-acid batteries, 150 kg or less in total, to our plant in Dubai Industrial City on working days until 6 pm. We accept them free of charge and email you a recycling certificate. For more than 10 batteries or over 150 kg, we buy them: send an enquiry and our team will reply with an offer." },
  { k: ["price", "rate", "cost", "quote", "سعر", "how much"], a: "Prices and scrap purchase rates are quoted for each enquiry, because they depend on grade, quantity and delivery. Start an enquiry and the right team will quote you." },
  { k: ["address", "location", "where", "visit", "map", "hours", "timing", "عنوان"], a: `We're at ${PLANT}. We receive material on ${HOURS}. Factory: +971 4 4366522. Head office: +971 4 3411193. Email: hello@dubatt.com.` },
  { k: ["phone", "call", "email", "contact", "whatsapp"], a: "You can reach us at hello@dubatt.com, factory +971 4 4366522, or head office +971 4 3411193." },
  { k: ["lithium", "li-ion", "nicd", "ni-cd"], a: "We arrange safe, approved disposal of lithium-ion and Ni-Cd batteries through licensed partners, for a processing fee. Send an enquiry and our team will quote the fee for your battery type and quantity." },
  { k: ["fridge", "washing machine", "tv", "television", "appliance", "air condition"], a: "We don't accept TVs, washing machines, fridges or other household appliances. Please contact a licensed e-waste recycler for these. We do accept mobile phones, computers, cables and wires free of charge." },
  { k: ["e-waste", "ewaste", "electronic", "laptop", "computer", "mobile phone", "cable", "wire"], a: "We accept mobile phones, computers and laptops, cables, wires and similar items free of charge. We don't take TVs, washing machines, fridges or other appliances. Choose \"Sell us scrap batteries or waste\" to arrange the hand-over." },
  { k: ["iso", "certif", "license", "licence", "permit", "icv"], a: TOPICS[2].a },
  { k: ["capacity", "tons", "tonnes", "size"], a: TOPICS[3].a },
  { k: ["co2", "carbon", "emission", "sustainab", "environment", "esg"], a: TOPICS[1].a },
  { k: ["process", "how do you", "recycl"], a: TOPICS[0].a },
  { k: ["job", "career", "vacanc", "cv", "resume", "work", "وظيفة"], a: "We don't list vacancies on the website, but our HR team reviews every CV against current and upcoming roles. Choose Careers and CV to send yours." },
  { k: ["alloy", "calcium", "antimony", "tin", "selenium", "ingot", "lead", "purity"], a: "We produce pure lead ingots at 99.97–99.985% and lead-calcium, lead-tin, lead-antimony-arsenic, lead-selenium and custom alloys to customer specification, tested in our in-house spectro lab." }
];

/* ---------- Styles (scoped in shadow DOM) ---------- */
const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.root { --bg:#eef1ef; --surface:#fff; --ink:#16201b; --muted:#5a6760; --line:#d6ddd9; --accent:#00813a; --accent-ink:#006a30; --on-accent:#fff;
  --accent-soft:#e0f1e7; --bubble:#f1f4f2; --warn-soft:#fbf1dc; --warn-ink:#7a5208; --err:#b3261e;
  font-family: "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif; font-size: 14px; line-height: 1.5; color: var(--ink); }
.launcher { position: fixed; right: 20px; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); z-index: 2147483000; border: 0; background: var(--accent); color: var(--on-accent);
  border-radius: 999px; padding: 13px 18px; font: 600 14px/1 inherit; font-family: inherit; box-shadow: 0 10px 30px -8px rgba(18,32,25,.5); cursor: pointer; display: flex; align-items: center; gap: 8px; }
.launcher svg { width: 18px; height: 18px; }
.panel { position: fixed; right: 20px; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); z-index: 2147483001; width: 390px; height: min(640px, calc(100vh - 40px));
  display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
  box-shadow: 0 18px 50px -18px rgba(18,32,25,.45), 0 2px 6px rgba(18,32,25,.08); overflow: hidden; }
@media (max-width: 520px) { .panel { right: 0; bottom: 0; left: 0; top: 0; width: auto; height: auto; border-radius: 0; border: 0;
  padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); } }
[hidden] { display: none !important; }
.head { display: flex; align-items: center; gap: 10px; padding: 12px 12px 12px 14px; border-bottom: 1px solid var(--line); }
.mark { width: 34px; height: 34px; border-radius: 8px; background: var(--accent); display: grid; place-items: center; flex: none; }
.mark svg { width: 20px; height: 20px; }
.t { min-width: 0; flex: 1; }
.t b { display: block; font-size: 15px; }
.t small { color: var(--muted); font-size: 12px; }
.ib { border: 1px solid var(--line); background: transparent; color: var(--ink); border-radius: 8px; height: 30px; padding: 0 10px; font: 500 12px inherit; font-family: inherit; cursor: pointer; }
.ib:hover { background: var(--bubble); }
.log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; overscroll-behavior: contain; }
.row { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.row.user { align-items: flex-end; }
.msg { max-width: 88%; padding: 9px 12px; border-radius: 12px; white-space: pre-line; overflow-wrap: anywhere; }
.bot .msg { background: var(--bubble); border-top-left-radius: 4px; }
.user .msg { background: var(--accent); color: var(--on-accent); border-top-right-radius: 4px; }
.note { max-width: 88%; font-size: 12.5px; padding: 8px 10px; border-radius: 8px; background: var(--accent-soft); }
.note.warn { background: var(--warn-soft); color: var(--warn-ink); }
.note b { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; margin-right: 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; max-width: 100%; }
.chip { border: 1px solid var(--accent); color: var(--accent-ink); background: var(--surface); border-radius: 999px; padding: 6px 12px; font: 500 13px inherit; font-family: inherit; cursor: pointer; text-align: left; }
.chip:hover:not(:disabled) { background: var(--accent-soft); }
.chip:disabled { cursor: default; opacity: .4; }
.chip.picked { opacity: 1; background: var(--accent-soft); }
button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.typing { display: inline-flex; gap: 4px; padding: 12px; }
.typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--muted); animation: blink 1s infinite; }
.typing i:nth-child(2) { animation-delay: .15s; } .typing i:nth-child(3) { animation-delay: .3s; }
@keyframes blink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .typing i { animation: none; opacity: .6; } }
.card { width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px; display: grid; gap: 8px; }
.card label { display: grid; gap: 3px; font-size: 12px; color: var(--muted); }
.card input[type=text], .card input[type=email], .card input[type=tel] { font: 14px inherit; font-family: inherit; color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; width: 100%; }
.card .consent { display: flex; gap: 8px; align-items: flex-start; color: var(--ink); font-size: 12px; }
.card .consent input { margin-top: 3px; accent-color: var(--accent); }
.card .consent a { color: var(--accent-ink); }
.err { color: var(--err); font-size: 12px; }
.hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
.btn { border: 0; background: var(--accent); color: var(--on-accent); border-radius: 8px; padding: 9px 14px; font: 600 14px inherit; font-family: inherit; cursor: pointer; }
.btn:disabled { opacity: .5; cursor: default; }
.btn.ghost { background: transparent; color: var(--accent-ink); border: 1px solid var(--line); }
.fname { font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
.composer { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--line); }
.composer input { flex: 1; min-width: 0; font: 16px inherit; font-family: inherit; color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; }
.send { border: 0; background: var(--accent); color: var(--on-accent); border-radius: 10px; width: 42px; cursor: pointer; display: grid; place-items: center; }
.send svg { width: 18px; height: 18px; }
.foot { text-align: center; font-size: 11px; color: var(--muted); padding: 0 10px 8px; }
`;

/* ---------- DOM ---------- */
const host = document.createElement("div");
host.id = "dubatt-assistant";
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: "open" });
shadow.innerHTML = `<style>${CSS}</style>
<div class="root">
  <button class="launcher" type="button" aria-label="Open the Dubatt Assistant"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 4h14v9H8l-4 3v-3H3z"/></svg>Chat with Dubatt</button>
  <section class="panel" role="dialog" aria-label="Dubatt Assistant" hidden>
    <div class="head">
      <div class="mark" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 6h12l2 8H2z" fill="#fff"/></svg></div>
      <div class="t"><b>Dubatt Assistant</b><small>Products, scrap batteries, suppliers, careers</small></div>
      <button class="ib menu" type="button">Menu</button>
      <button class="ib close" type="button" aria-label="Close chat">&#10005;</button>
    </div>
    <div class="log" aria-live="polite"></div>
    <form class="composer" autocomplete="off">
      <input type="text" placeholder="Type a question" aria-label="Message" maxlength="1000">
      <button class="send" type="submit" aria-label="Send"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h13M11 5l5 5-5 5"/></svg></button>
    </form>
    <div class="foot">AI answers can be wrong. Our team confirms all prices, terms and offers.</div>
  </section>
</div>`;
const $ = s => shadow.querySelector(s);
const log = $(".log"), input = $(".composer input"), panel = $(".panel"), launcher = $(".launcher");

/* ---------- State ---------- */
const S = { flow: null, idx: -1, answers: {}, codes: {}, awaiting: null, cv: null, turns: [], aiOff: false, busy: false, started: false, seq: 0 };
const sleep = ms => new Promise(r => setTimeout(r, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function scroll() { log.scrollTop = log.scrollHeight; }
function row(who) { const r = el("div", "row " + who); log.append(r); return r; }
function typing(r) { const t = el("div", "typing"); t.innerHTML = "<i></i><i></i><i></i>"; r.append(t); scroll(); return t; }
async function bot(text, fast) { const r = row("bot"); const t = typing(r); await sleep(fast ? 150 : 350); t.remove(); r.append(el("div", "msg", text)); scroll(); return r; }
function user(text) { const r = row("user"); r.append(el("div", "msg", text)); scroll(); }
function note(text, warn) {
  const last = log.lastElementChild;
  const r = last && last.classList.contains("bot") ? last : row("bot");
  const n = el("div", "note" + (warn ? " warn" : "")); n.append(el("b", null, warn ? "Please note" : "Note"), document.createTextNode(text)); r.append(n); scroll();
}
function chips(r, options, onPick) {
  const w = el("div", "chips");
  options.forEach(o => {
    const b = el("button", "chip", o.l); b.type = "button";
    b.addEventListener("click", () => {
      if (w.dataset.done) return; w.dataset.done = "1";
      w.querySelectorAll("button").forEach(x => { x.disabled = true; if (x === b) x.classList.add("picked"); });
      onPick(o);
    });
    w.append(b);
  });
  r.append(w); scroll(); return w;
}
function closeChips() { log.querySelectorAll(".chips:not([data-done])").forEach(w => { w.dataset.done = "1"; w.querySelectorAll("button").forEach(b => b.disabled = true); }); }
function resetPrompt() { S.awaiting = null; input.placeholder = "Type a question"; }

/* ---------- Menu and topics ---------- */
const MENU = [
  { v: "buy", l: "Buy our products" }, { v: "sell", l: "Sell us scrap batteries or waste" },
  { v: "supply", l: "Supply chemicals, materials or services" }, { v: "jobs", l: "Careers and CV" },
  { v: "learn", l: "Recycling and sustainability info" }
];
async function menu(first) {
  S.flow = null; resetPrompt();
  const r = await bot(first
    ? "Welcome to Dubatt. I can help you buy our products, sell us used batteries or scrap, register as a supplier, send your CV, or find recycling and sustainability information.\n\nWhat brings you here today?"
    : "What would you like to do next?");
  chips(r, MENU, o => { user(o.l); o.v === "learn" ? learn() : startFlow(o.v); });
  if (first) note("You can also type a question at any time, in English or Arabic.");
}
async function learn() {
  const r = await bot("What would you like to know?");
  chips(r, [...TOPICS, { v: "_req", l: "Request data, a visit or an interview" }], async o => {
    user(o.l);
    if (o.v === "_req") return startFlow("info");
    const a = await bot(o.a);
    chips(a, [{ v: "more", l: "Another topic" }, { v: "ask", l: "Ask my own question" }, { v: "req", l: "Request data or a visit" }, { v: "menu", l: "Main menu" }], p => {
      user(p.l);
      if (p.v === "more") learn(); else if (p.v === "req") startFlow("info"); else if (p.v === "menu") menu();
      else { bot("Go ahead, type your question below.", true); input.focus(); }
    });
  });
}

/* ---------- Flow engine ---------- */
async function startFlow(id) {
  closeChips();
  const f = FLOWS[id]; Object.assign(S, { flow: id, idx: -1, answers: {}, codes: {}, cv: null }); resetPrompt();
  await bot(f.intro);
  if (f.notice) note(f.notice.text, f.notice.warn);
  next();
}
function next() {
  const f = FLOWS[S.flow]; if (!f) return;
  let i = S.idx + 1;
  while (i < f.steps.length && f.steps[i].when && !f.steps[i].when(S.codes)) i++;
  S.idx = i;
  if (i < f.steps.length) ask(f.steps[i]);
}
async function ask(s) {
  if (s.type === "choice") {
    const r = await bot(s.ask);
    chips(r, s.options, o => {
      user(o.l); S.answers[s.key] = o.l; S.codes[s.key] = o.v;
      if (o.note) note(o.note, o.warn);
      if (o.stop) { S.flow = null; menu(); return; }
      if (s.noteAfter) note(s.noteAfter);
      next();
    });
  } else if (s.type === "text") {
    const r = await bot(s.ask);
    S.awaiting = s; input.placeholder = s.placeholder || "Type your answer"; input.focus();
    if (s.optional) chips(r, [{ v: "skip", l: "Skip" }], () => { user("Skip"); resetPrompt(); next(); });
  } else if (s.type === "file") {
    fileCard(await bot(s.ask), s);
  } else if (s.type === "contact") {
    contactCard(await bot("Last step: your contact details."), s);
  }
}
function answerText(s, text) { S.answers[s.key] = text; S.codes[s.key] = text; resetPrompt(); closeChips(); next(); }

function fileCard(r, s) {
  const n = ++S.seq, card = el("div", "card");
  card.innerHTML = `<label for="cv${n}">CV file</label><input id="cv${n}" type="file" accept=".pdf,.doc,.docx"><div class="fname"></div><div class="err"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ok" type="button" disabled>Attach CV</button><button class="btn ghost skip" type="button">I'll email it instead</button></div>`;
  r.append(card); scroll();
  const fi = card.querySelector("input"), ok = card.querySelector(".ok"), sk = card.querySelector(".skip"), err = card.querySelector(".err"), nm = card.querySelector(".fname");
  let file = null;
  fi.addEventListener("change", () => {
    file = fi.files[0] || null; err.textContent = ""; nm.textContent = ""; ok.disabled = true;
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) { err.textContent = "Please choose a PDF or Word file."; file = null; return; }
    if (file.size > 4 * 1024 * 1024) { err.textContent = "That file is over 4 MB. Please attach a smaller version."; file = null; return; }
    nm.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`; ok.disabled = false;
  });
  const done = () => [fi, ok, sk].forEach(x => x.disabled = true);
  ok.addEventListener("click", () => { done(); S.cv = file; user("Attached " + file.name); S.answers[s.key] = file.name; next(); });
  sk.addEventListener("click", () => { done(); user("I'll email it instead"); S.answers[s.key] = "To be emailed"; note("No problem. Reply to HR's acknowledgement with your CV attached."); next(); });
}

function contactCard(r, s) {
  const n = ++S.seq, form = el("form", "card"); form.noValidate = true;
  const consentText = esc(s.consent || CONSENT).replace("privacy notice", PRIVACY_URL ? `<a href="${esc(PRIVACY_URL)}" target="_blank" rel="noopener">privacy notice</a>` : "privacy notice");
  form.innerHTML = s.fields.map(x => `<label for="c${n}-${x.k}">${esc(x.l)}${x.req ? "" : " (optional)"}<input id="c${n}-${x.k}" name="${x.k}" type="${x.t}" autocomplete="${x.ac}" maxlength="160"></label>`).join("")
    + `<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">`
    + `<label class="consent" for="c${n}-consent"><input id="c${n}-consent" type="checkbox"><span>${consentText}</span></label><div class="err"></div><button class="btn" type="submit">Send enquiry</button>`;
  r.append(form); scroll();
  const errEl = form.querySelector(".err"), btn = form.querySelector('button[type=submit]');
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const v = {}; s.fields.forEach(x => v[x.k] = form.querySelector(`#c${n}-${x.k}`).value.trim());
    const errs = [];
    s.fields.forEach(x => { if (x.req && !v[x.k]) errs.push(x.l.replace(/ \(.*\)$/, "").toLowerCase()); });
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errs.push("a valid email address");
    if (v.phone && v.phone.replace(/\D/g, "").length < 8) errs.push("a phone number with country code");
    if (!form.querySelector(`#c${n}-consent`).checked) errs.push("your agreement to the privacy terms");
    if (errs.length) { errEl.textContent = "Please add " + errs.join(", ") + "."; return; }
    errEl.textContent = ""; btn.disabled = true; btn.textContent = "Sending…";
    const ok = await submit(v, form.querySelector('input[name=website]').value);
    if (ok) form.querySelectorAll("input,button").forEach(x => x.disabled = true);
    else { btn.disabled = false; btn.textContent = "Try again"; errEl.textContent = "We couldn't send your enquiry. Please try again, or email hello@dubatt.com."; }
  });
}

async function submit(contact, honeypot) {
  const f = FLOWS[S.flow];
  const type = f.typeFor ? f.typeFor(S.codes) : f.label;
  const fd = new FormData();
  fd.append("flow", S.flow); fd.append("type", type); fd.append("page", location.href.slice(0, 500));
  fd.append("contact", JSON.stringify(contact)); fd.append("details", JSON.stringify(S.answers));
  fd.append("consent", "yes"); fd.append("website", honeypot || "");
  if (S.cv) fd.append("cv", S.cv, S.cv.name);
  let data;
  try {
    const res = await fetch(API + "/api/enquiry", { method: "POST", body: fd });
    data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return false;
  } catch { return false; }
  const ref = data.ref, first = (contact.name || "").split(/\s+/)[0];
  const custom = f.done ? f.done(S.codes, ref, contact, first) : null;
  const r = await bot(custom || `Thank you${first ? ", " + first : ""}. Your reference is ${ref}. I've passed your enquiry to our ${f.team}, who will reply to ${contact.email}.`);
  const after = typeof f.after === "function" ? f.after(S.codes) : f.after;
  if (after) note(after);
  S.flow = null; S.cv = null;
  chips(r, [{ v: "ask", l: "Ask a question" }, { v: "menu", l: "Start another enquiry" }], o => { user(o.l); if (o.v === "menu") menu(); else { bot("Go ahead, type your question below.", true); input.focus(); } });
  return true;
}

/* ---------- AI answers ---------- */
const clean = t => t.replace(/\[\[route:\w+\]\]/g, "").replace(/\[\[[^\]]*$/, "").replace(/\*\*/g, "").trim();
function faq(q) {
  const s = q.toLowerCase(), hit = FAQ.find(f => f.k.some(k => s.includes(k)));
  return hit ? hit.a : "I don't have an answer to that here. Our team can help: email hello@dubatt.com or call +971 4 4366522, or choose an option from the menu.";
}
function guessRoute(q) {
  const s = q.toLowerCase();
  if (/(sell|scrap|old batter|used batter|dispose|collect|e-waste|ewaste)/.test(s)) return "sell";
  if (/(buy|purchase|order|ingot|alloy)/.test(s)) return "buy";
  if (/(supplier|vendor|we supply|register as)/.test(s)) return "supply";
  if (/(job|career|cv|resume|vacanc|hiring)/.test(s)) return "jobs";
  return null;
}
function offerRoute(r, t) {
  if (!t || !FLOWS[t] || S.flow === t) return;
  chips(r, [{ v: t, l: "Start: " + FLOWS[t].label }], () => { user(FLOWS[t].label); startFlow(t); });
}
async function askAI(q) {
  user(q); S.busy = true;
  const r = row("bot"), t = typing(r);
  const fallback = () => { t.remove(); r.append(el("div", "msg", faq(q))); offerRoute(r, guessRoute(q)); };
  if (S.aiOff) { await sleep(300); fallback(); S.busy = false; scroll(); return; }
  const messages = [...S.turns.slice(-10), { role: "user", content: q }];
  let m = null, text = "";
  try {
    const res = await fetch(API + "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages, flow: S.flow }) });
    if (res.status === 503) S.aiOff = true;
    if (!res.ok || !res.body) throw new Error("http " + res.status);
    const reader = res.body.getReader(), dec = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
      const shown = clean(text);
      if (shown) { if (!m) { t.remove(); m = el("div", "msg"); r.append(m); } m.textContent = shown; scroll(); }
    }
    if (!clean(text)) throw new Error("empty");
    S.turns.push({ role: "user", content: q }, { role: "assistant", content: text });
    offerRoute(r, (text.match(/\[\[route:(\w+)\]\]/) || [])[1]);
  } catch {
    if (m) m.remove();
    fallback();
  }
  S.busy = false; scroll();
}

/* ---------- Wiring ---------- */
$(".composer").addEventListener("submit", e => {
  e.preventDefault();
  const q = input.value.trim(); if (!q || S.busy) return;
  input.value = "";
  if (S.awaiting) { user(q); answerText(S.awaiting, q); } else askAI(q);
});
$(".menu").addEventListener("click", () => { closeChips(); user("Main menu"); menu(); });
function open() {
  panel.hidden = false; launcher.hidden = true;
  if (!S.started) { S.started = true; menu(true); }
  setTimeout(() => input.focus(), 50);
}
function close() { panel.hidden = true; launcher.hidden = false; launcher.focus(); }
launcher.addEventListener("click", open);
$(".close").addEventListener("click", close);
panel.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
window.DubattAssistant = { open, close };
if (OPEN_ON_LOAD) open();
})();
