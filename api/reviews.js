export default async function handler(req, res) {
  try {
    const { businessSlug, reviewerPhone, userId, userName } = req.query;
    const API_KEY = process.env.AIRTABLE_API_KEY;
    const BASE_ID = process.env.AIRTABLE_BASE_ID;
    const REVIEWS = process.env.AIRTABLE_REVIEWS_TABLE;
    const headers = { Authorization: `Bearer ${API_KEY}` };

    const slugify = s => (s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)+/g,"");
    const collect = async (filterByFormula) => {
      let out=[], offset;
      do {
        const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${REVIEWS}`);
        url.searchParams.set("pageSize","100");
        if (offset) url.searchParams.set("offset", offset);
        if (filterByFormula) url.searchParams.set("filterByFormula", filterByFormula);
        const r = await fetch(url, { headers });
        const j = await r.json();
        out = out.concat(j.records || []);
        offset = j.offset;
      } while (offset);
      return out;
    };

    let recs=[];
    if (reviewerPhone) recs = await collect(`({ReviewerPhoneNumber}='${reviewerPhone}')`);
    else if (userId) recs = await collect(`{ID (from Creator)}="${userId}"`);
    else if (userName) recs = await collect(`{Name_Creator}="${userName}"`);
    else if (businessSlug) recs = (await collect()).filter(r => slugify(r.fields.business_name||"")===businessSlug);
    else return res.status(200).json({ reviews: [] });

    const reviews = recs.map(r => {
      const f = r.fields||{};
      const city = Array.isArray(f.City) ? (f.City[0]||"").trim() :
                   typeof f.City==="string" ? f.City.trim() : "";
      const user =
        (typeof f["Name_Creator"]==="string" && f["Name_Creator"].trim()) ? f["Name_Creator"] :
        (Array.isArray(f["Name_Creator"]) && f["Name_Creator"][0]) ? f["Name_Creator"][0] :
        (typeof f["Reviewer"]==="string" && f["Reviewer"].trim()) ? f["Reviewer"] :
        (Array.isArray(f["Reviewer"]) && f["Reviewer"][0]) ? f["Reviewer"][0] : "Anonymous";

      // --- NBA / Decision Timeline fields (safe defaults for older rows) ---
      const rawSentiment = (f["NBA_Sentiment"] || "").toString().toLowerCase().trim();
      const sentiment = ["high","medium","low"].includes(rawSentiment) ? rawSentiment : null;

      const rawStatus = (f["NBA_Status"] || "").toString().toLowerCase().trim().replace(/\s+/g, "_");
      const nba_status = ["pending_approval","approved","sent","ignored"].includes(rawStatus) ? rawStatus : null;

      // Airtable checkboxes return true/false; treat anything truthy as true
      const needs_human_review = !!(f["NBA_Human_Review"]);

      return {
        record_id: r.id || null,
        businessName: f.business_name || "",
        uplaud: f.Uplaud || "",
        date: f.Date_Added || null,
        score: typeof f["Uplaud Score"]==="number" ? f["Uplaud Score"] : null,
        shareLink: f["Share Link"] || "",
        referralLink: f["ReferralLink"] || f["Referral Link"] || "",
        location: city,
        category: f.Category || "Other",
        user,
        // NBA fields
        sentiment,
        category_nba: f["NBA_Category"] || null,
        next_best_action: f["NBA_Action"] || null,
        suggested_message: f["NBA_Message"] || null,
        human_rationale: f["NBA_Rationale"] || null,
        nba_status,
        needs_human_review,
      };
    }).filter(x => x.businessName && x.uplaud)
      .sort((a,b)=> new Date(b.date||0) - new Date(a.date||0));

    res.status(200).json({ reviews });
  } catch (e) { res.status(500).json({ error: "server error" }); }
}
