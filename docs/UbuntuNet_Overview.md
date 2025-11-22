UbuntuNet Ads Management Onboarding Tool – Design Outline

1 Purpose and context

UbuntuNet plans to monetise Golden Arrow Bus Services (GABS) Wi‑Fi/captive‑portal inventory by letting advertisers choose specific bus routes and book campaigns.  GABS operates a large bus network in Cape Town: the Moovit platform lists 100 bus lines and 91 stops, with a coverage area stretching from Mamre in the north to Strand in the south ￼.  GABS reported that it moves about 230 000 travellers per day using a fleet of ~1 171 buses across 1 300 routes, employs ~2 500 staff and drives 59.7 million km each year ￼ ￼.  Media reports confirm that the company serves over 200 000 daily passengers on 1 300 routes ￼.  The bus network therefore offers a large, captive commuter audience.

An ads‑management tool, similar to Facebook Ads Manager, will allow advertisers – from national brands to local SMEs – to select routes and calculate campaign costs.  This document outlines the requirements, data inputs and pricing logic for such a tool.

2 Data sources and segmentation
	1.	Route/timetable data – Routes and timetables can be downloaded from GABS via PDF schedules (example: CAPE TOWN – DURBANVILLE – FISANTEKRAAL timetable dated 23 Jun 2025, accessible through the GABS website).  Each timetable includes the origin, destination, intermediate stops and the effective date.  A technical process will parse these timetables into a database of unique routes, noting frequency (buses per day) and service windows (weekday, weekend, peak/off‑peak).
	2.	Ridership estimates – GABS operates roughly 1 171 buses and records around 230 000 travellers per day ￼.  These figures yield an average of 196 passengers per bus per day (230 000 ÷ 1 171).  Ridership will vary by route; estimates can be refined using ticket sales, Wi‑Fi login statistics or external studies (e.g., Moovit identifies popular lines like Bellville – Cape Town and Blaauwberg – Town Centre ￼).  The system should maintain an estimated daily ridership per route to drive pricing.
	3.	Audience profiles – Earlier analyses identified key commuter segments:
	•	Early‑shift/service workers – price‑sensitive; interested in food specials, banking products and cheap data.
	•	Office/call‑centre workers – medium income; interested in personal loans, device finance, gyms and e‑commerce.
	•	Students/learners – need educational courses, entry‑level banking and youth bundles.
	•	Parents/caregivers – value grocery discounts, school finance, healthcare and insurance.
	•	Informal traders/side‑hustlers – need wholesale supplies, microfinance and payment solutions.

Route selection can thus be tied to demographic profiles (e.g., routes through townships vs. CBD corridors).

3 Core functionality of the onboarding tool
	1.	User onboarding & account management
	•	Advertisers create an account (with KYC if needed) and specify whether they are a large brand or SME.
	•	Provide business information, campaign objectives (brand awareness, lead generation, voucher redemption) and target audience.
	2.	Route selection interface
	•	Interactive map or route list – Display the 100 bus lines/1 300 route variations with origin–destination pairs.  Users can search by suburb, route name or stops.  Each route entry shows:
	•	Estimated daily ridership (calculated from ridership averages or Wi‑Fi login counts).
	•	Number of buses assigned to the route.
	•	Operating hours and days (peak/off‑peak windows).
	•	Price bands (see Section 4).
	•	Users can select multiple routes or geographical “zones” (e.g., CBD–Bellville corridor).  Filters allow segmentation by ridership tier (e.g., top‑10 routes, medium, long‑tail) or demographic profile.
	3.	Campaign configuration
	•	Format selection – Choose ad placements such as:
	•	Wi‑Fi splash‑page takeovers (everyone connecting sees the brand).
	•	In‑portal banners (rotating ads while users browse).
	•	Voucher codes or QR sign‑ups (for performance campaigns).
	•	Optional physical activations (branding at major depots or bus wraps) handled offline.
	•	Timing – Choose start and end dates, days of week and time‑of‑day windows (morning peak, off‑peak, evening).  The tool checks timetable data to ensure buses operate during selected windows.
	•	Budget & bidding – Enter a total budget or cost‑per‑impression target.  The tool will calculate estimated impressions and cost (see pricing logic below).
	4.	Estimation engine & pricing logic
Pricing should align with ridership and inventory scarcity:
	•	Base fee per route – Each route has a “base CPM” (cost per thousand impressions) derived from its estimated daily ridership.  For example, if a route carries 3 000 passengers per day and the base CPM is R50, then the daily base fee is (3 000 ÷ 1 000) × R50 = R150.  Long routes or high‑frequency corridors may command higher CPMs.
	•	Bus multiplier – Multiply the base fee by the number of buses operating on that route during the chosen window.  A route with 5 buses operating in the morning peak would cost 5 × R150 = R750 per day.
	•	Time‑of‑day adjustment – Apply discounts for off‑peak windows (e.g., –40 %) and premiums for peak hours (+20 %).
	•	Campaign duration – Multiply the adjusted daily cost by the number of days.  Weekly and monthly packages can include bulk discounts.
	•	Format coefficient – Splash‑page takeovers may cost 2–3× more than in‑portal banners; performance campaigns with QR codes may add a cost per lead (e.g., R50 per qualified lead) on top of the base fee.
	•	Optional data & analytics fee – Access to anonymised campaign analytics (ridership heat maps, voucher redemptions, survey results) can be bundled into premium tiers.
An example calculation:
An SME chooses the Bellville – Cape Town route (estimated 4 000 passengers/day) for a 4‑week in‑portal banner campaign across all day parts.  Base CPM = R40; buses on route during the chosen periods = 6; no time‑of‑day premium.
Daily base cost = (4 000/1 000) × R40 = R160
Route cost per day = R160 × 6 buses = R960
4‑week cost = R960 × 28 days = R26 880
An SME package discount of 10 % could bring the total to ≈ R24 200.
	5.	Checkout & payment
	•	Once the tool calculates estimated cost and reach, advertisers can review their order, upload creatives and proceed to payment (credit card, EFT or invoice).  The system should enforce campaign start dates only after payment is confirmed.
	6.	Campaign management & reporting
	•	Provide a dashboard showing live impressions, Wi‑Fi logins, click‑throughs, voucher redemptions and cost delivery.  Data is anonymised and aggregated to protect commuter privacy.
	•	For performance campaigns, deliver lead lists or voucher redemption reports.
	•	Enable editing of live campaigns (adding routes, extending duration, pausing low‑performing creatives).

4 Product strategy and roadmap
	1.	Phase 1 – MVP (0–3 months)
	•	Ingest timetable PDFs and create a central route database.  Use ridership averages derived from the overall passenger count (≈230 000/day) by allocating passengers proportionally based on bus counts per route.
	•	Build a simple web application (React + Tailwind + shadcn/ui) with a route selector, cost estimator and order form.  Allow managed service: a sales team can assist SMEs via offline invoices while the tool generates quotes.
	•	Integrate with UbuntuNet’s ad server to schedule creative files for selected buses.
	2.	Phase 2 – Self‑serve platform (3–9 months)
	•	Add interactive mapping (e.g., OpenStreetMap) to visualise routes and stops.  Provide demographic overlays (income level, student density) for better targeting.
	•	Implement account management, saved audiences and payment gateway integration.
	•	Introduce budget pacing, frequency capping and real‑time availability checks to prevent over‑booking.
	3.	Phase 3 – Data‑driven optimisation (9–18 months)
	•	Use actual Wi‑Fi login data and captive‑portal analytics to update ridership models and improve cost estimates.  For example, adjust CPMs based on real impressions and demand.
	•	Offer automated recommendations (e.g., “Your budget could reach 20 % more riders if you include Route X”).
	•	Provide advanced analytics dashboards and API endpoints for big brands and agencies.
	4.	Extensions
	•	Multi‑operator expansion – white‑label the platform for other bus/taxi operators; provide operator‑specific dashboards and revenue‑share management.
	•	Integrations – connect with voucher platforms, CRM systems or WhatsApp Business for lead follow‑up.
	•	Bundled sponsorships – combine digital ads with bus wraps, depot activations or sponsored Wi‑Fi (telco partnership).  Pricing models would add production and management fees to the digital base cost.

5 Conclusions

Golden Arrow’s bus network offers a valuable media channel – over 230 000 daily passengers and 1 171 buses across ~1 300 routes ￼ ￼.  By building an ads management onboarding tool on the UbuntuNet platform, advertisers can self‑select routes, estimate costs and launch campaigns much like Facebook Ads Manager but tailored to Cape Town’s commuter landscape.  Pricing should reflect ridership and inventory scarcity, with clear tiers for big brands and SMEs.  Over time, integrating real ridership data, mapping and optimisation algorithms will make the tool a sophisticated marketplace for out‑of‑home digital advertising.