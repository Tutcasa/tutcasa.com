"use client";

/**
 * TutCasa shared i18n — EN / FR / ES, ported verbatim from the demo's
 * window.I18N. Strings are HTML (entities + inline tags) exactly as the
 * demo injected them via innerHTML, so consumers render them with
 * dangerouslySetInnerHTML through the <T> component below.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "fr" | "es";

export const I18N: Record<Lang, Record<string, string>> = {
  en: {
    nav_stays: `Stays`, nav_concierge: `Concierge`, nav_tours: `Tours &amp; Parks`, nav_family: `Our Family`,
    foot_blurb: `A family-run collection of homes across Mexico, Egypt &amp; Florida. Book direct, pay safely, stay like a king.`,
    foot_explore: `Explore`, foot_popular: `Popular casas`, foot_experiences: `Experiences`, foot_company: `Company`,
    foot_investors: `Investors`, foot_loyalty: `Loyalty program`, foot_gift: `Gift cards`, foot_list: `List my property`,
    foot_support: `Support`, foot_help: `Help &amp; policies`, foot_contact: `Contact`, foot_concierge: `Concierge on WhatsApp`,
    foot_terms: `Terms &amp; conditions`, foot_privacy: `Privacy`, foot_cookies: `Cookies`,
    wa_title: `Chat with May`, wa_sub: `replies in minutes`,
    fam_eyebrow: `Our story`, fam_h1: `The family behind <span class="rosa">TutCasa.</span>`,
    fam_lede: `A Canadian&ndash;Egyptian couple who turned a love of travel into a home for every kind of traveller.`,
    fam_tag: `&#127796; How it started`, fam_story_h: `From one condo to a <span class="em">curated collection.</span>`,
    fam_p1: `TUT CASA was born from a shared vision between a Canadian&ndash;Egyptian couple with a deep passion for travel and meaningful experiences. What started as finding a way to rent our condo in Playa del Carmen, Mexico quickly grew into something much bigger.`,
    fam_p2: `As passionate travellers, we saw an opportunity in the vacation rentals market &mdash; one to deliver stays that feel effortless, elevated, and truly memorable for our guests, while maximizing ROI for our home owners, hassle-free.`,
    fam_p3: `Today, TUT CASA offers a curated collection of 40+ homes in Mareazul, Playa del Carmen and beyond, welcoming 200+ satisfied guests into seamless, home-away-from-home experiences designed for comfort, style, and unforgettable moments.`,
    fam_sign: `&mdash; The TutCasa family`,
    fam_stat1: `homes in our curated collection`, fam_stat2: `satisfied guests welcomed`, fam_stat3: `hands-on, family-run hosting`,
    fam_val_title: `What we believe`, fam_val_sub: `Every stay should feel effortless for guests and rewarding for owners.`,
    fam_v1_h: `Effortless &amp; elevated`, fam_v1_p: `Stays that feel curated and calm from the first message to check-out &mdash; no surprises, no friction.`,
    fam_v2_h: `A real home away from home`, fam_v2_p: `Comfort, style, and the little touches that turn a booking into a memory you keep.`,
    fam_v3_h: `Owners come first too`, fam_v3_p: `We maximize ROI for our home owners with honest reporting and full-service management &mdash; hassle-free.`,
    fam_cta_h: `Come stay with the family.`, fam_cta_p: `Find your casa in a few clicks, or list your property with people who treat it like their own.`,
    fam_cta_b1: `Find a casa`, fam_cta_b2: `List my property`,
    st_h1: `Find your <span class="rosa">casa.</span>`, st_sub: `Search our full collection of homes across Mexico, Egypt &amp; Florida.`,
    st_where: `Where`, st_addwhere: `Search destinations`, st_where_ph: `Type a city or country…`,
    st_checkin: `Check in`, st_checkout: `Check out`, st_who: `Who`, st_addguests: `Add guests`,
    st_adults: `Adults`, st_children: `Children`, st_babies: `Babies`, st_under2: `under 2`, st_guests: `guests`,
    st_t1a: `Best rate guaranteed`, st_t1b: `&mdash; always below Airbnb`, st_t2: `Free airport pickup`,
    st_t3: `WhatsApp concierge included`, st_t4: `Tours at partner prices`,
    st_results: `homes available`, st_allin: `All prices are all-in &mdash; no hidden fees`,
    st_none: `No homes match these filters yet. Try another destination.`,
    st_f_all: `All stays`, st_f_beach: `Beachfront`, st_f_pool: `Private pool`, st_f_playa: `Playa del Carmen`,
    st_f_tulum: `Tulum`, st_f_nuba: `Nuba, Egypt`, st_f_florida: `Florida`, st_f_villas: `Villas`, st_f_pent: `Penthouses`, st_f_family: `Family`,
    st_beds: `beds`, st_showmap: `Show location`, st_details: `View details`, st_night: `/ night · all-in`,
    exp_h1: `Explore experiences`, exp_sub: `Tours, parks and adventures across the Riviera Maya &amp; Yucatán — all at partner prices for TutCasa guests.`,
    exp_explore: `Explore`, exp_f_all: `All`, exp_f_water: `Water &amp; reef`, exp_f_culture: `Culture &amp; ruins`, exp_f_adventure: `Adventure`, exp_f_parks: `Parks`, exp_f_relax: `Relax &amp; VIP`,
    exp_cta_h: `Ready to book an experience?`, exp_cta_p: `Every tour comes at partner prices — usually well below what the big sites charge.`, exp_cta_b: `See tours &amp; pricing`,
    list_h1: `List your property with <span class="rosa">TutCasa.</span>`, list_sub: `Earn more, worry less. We handle everything — guests, cleaning, pricing and support — while you watch the ROI.`,
    list_stat1: `avg. occupancy`, list_stat2: `homes managed`, list_stat3: `guest support`,
    list_form_h: `Tell us about your place`, list_form_p: `Fill this in and our team will reach out within 24 hours.`,
    list_f_name: `Your name`, list_f_email: `Email`, list_f_phone: `Phone / WhatsApp`, list_f_loc: `Property location`, list_f_type: `Property type`,
    list_f_beds: `Bedrooms`, list_f_baths: `Bathrooms`, list_f_guests: `Max guests`, list_f_rate: `Nightly rate you have in mind (optional)`,
    list_f_amen: `Amenities`, list_f_listed: `Is it listed anywhere today?`, list_f_msg: `Anything else?`, list_f_consent: `I agree to be contacted by TutCasa about managing my property.`,
    list_submit: `Submit my property`, list_req: `Please complete the required fields.`,
    list_success_h: `Thank you! &#127881;`, list_success_p: `We&rsquo;ve received your property details. A member of the TutCasa family will reach out within 24 hours.`,
    list_why_h: `Why owners choose us`, list_w1_h: `Earn more`, list_w1_p: `Smart pricing and direct bookings mean higher net returns than going it alone.`,
    list_w2_h: `Truly hands-off`, list_w2_p: `Guests, cleaning, check-ins, maintenance and 24/7 support — all handled by us.`,
    list_w3_h: `Honest reporting`, list_w3_p: `Transparent statements and a real person you can always reach. No surprises.`,
    list_type_condo: `Condo`, list_type_villa: `Villa`, list_type_pent: `Penthouse`, list_type_house: `House`, list_type_other: `Other`,
    list_listed_airbnb: `Airbnb`, list_listed_vrbo: `Vrbo`, list_listed_both: `Both`, list_listed_no: `Not yet`,
    list_am_pool: `Pool`, list_am_parking: `Parking`, list_am_ac: `Air conditioning`, list_am_wifi: `Wi-Fi`, list_am_gym: `Gym`,
    list_choose: `Choose…`,
    nav_back: `Back`,
    home_aud_stay: `Find a casa`, home_aud_own: `I own a casa`,
    home_h1: `Find your casa in <span class="rosa">3 clicks.</span>`,
    home_sub: `No endless scrolling. Tell us how you travel — we&rsquo;ll match you with the right home. &#127796;`,
    home_guide: `Guide me`, home_search: `Search`,
    home_eyb_fav: `GUEST FAVOURITES`, home_pop_casas: `Popular casas`,
    home_eyb_book: `BOOK ALONGSIDE YOUR STAY`, home_pop_exp: `Popular experiences`,
    home_seeall_props: `See all our properties &rarr;`, home_seeall_exp: `See all experiences &rarr;`,
    home_familia_h: `You&rsquo;re not booking a listing. <span class="em">You&rsquo;re staying with us.</span>`,
    home_loved: `Loved by real guests`,
    exp_build_h: `Want something totally your own?`, exp_build_p: `Build your own private tour and we&rsquo;ll design a custom itinerary and quote &mdash; just for you.`,
    exp_build_b: `Build my own Tour`,
    byo_h: `Build Your Own Plan`, byo_sub: `Share your trip details and we&rsquo;ll design a fully custom itinerary and quote &mdash; just for you.`,
    byo_trip: `YOUR TRIP DETAILS`, byo_ci: `Check-in`, byo_co: `Check-out`, byo_adults: `Adults`, byo_children: `Children`,
    byo_accom: `Accommodation`, byo_yes: `Yes`, byo_no: `No`, byo_browse: `Tap to browse activities`,
    byo_dream: `WHAT ARE YOU DREAMING OF?`, byo_dream_ph: `Tell us what you&rsquo;d love to do — ruins, beaches, adventure, relaxation, a special celebration…`,
    byo_pick: `Select anything that catches your eye — we&rsquo;ll include exact pricing in your custom quote.`,
    byo_submit: `Get in Touch to Build My Plan`, byo_onreq: `On Request`, byo_person: `MXN/person`,
    byo_ok_h: `Your plan request is in! &#127881;`, byo_ok_p: `We&rsquo;ll design your custom itinerary and quote and reach out within 24 hours.`,
    list_am_tennis: `Tennis courts`, list_am_spa: `Spa`, list_am_kids: `Kids playground`,
    list_f_photos: `Photos of your property (up to 20)`, list_photos_hint: `Drag &amp; drop or tap to add &mdash; JPG or PNG`,
    /* stays page (demo adds these at runtime) */
    st_filters: `Filters`, st_seeall: `See all properties`, st_fil_price: `Max price per night`, st_allin_s: `all-in`,
    st_fil_beds: `Bedrooms`, st_fil_any: `Any`, st_fil_type: `Type &amp; amenities`, st_fil_clear: `Clear all`,
    st_fil_show: `Show`, st_fil_homes: `homes`, st_match_your: `Your matches`, st_match_in: `in`,
    st_fil_htype: `Home type`, st_fil_guests: `Guests`, st_fil_city: `Location`, st_fil_amen: `Amenities`,
    st_fil_opts: `Booking options`, st_opt_instant: `Instant book`, st_opt_selfci: `Self check-in`, st_opt_pets: `Pets allowed`,
    st_am_pool: `Pool`, st_am_jacuzzi: `Jacuzzi / hot tub`, st_am_gym: `Gym / fitness`, st_am_beach: `Beach / ocean view`,
    st_am_tennis: `Tennis &amp; pickleball`, st_am_kitchen: `Full kitchen`, st_am_washer: `Washer / dryer`, st_am_parking: `Parking`,
    st_am_wifi: `Wi-Fi`, st_am_ac: `Air conditioning`,
    /* property page */
    pd_back: `Back to stays`, pd_reviews: `reviews`, pd_about: `About this place`, pd_offers: `What this place offers`,
    pd_know: `Good to know`, pd_avail: `Availability`, pd_caltip: `Tap a start date, then an end date. Crossed-out days are already booked.`,
    pd_where: `Where you’ll be`, pd_things: `Things to know`, pd_pernight: `/ night · all-in`,
    pd_ci: `Check-in`, pd_co: `Check-out`, pd_guests: `Guests`, pd_booknow: `Book now`, pd_ask: `Ask May on WhatsApp`,
    pd_nocharge: `You won’t be charged yet · concierge confirms every booking`, pd_similar: `Similar homes you’ll love`,
    /* tours & parks page */
    tt_sub: `Private, guided day adventures across the Riviera Maya &amp; Yucatán. Pick your date and group size, then choose the tour that calls to you — every tour is fully private, just for your group.`,
    byo_book: `Book now`, byo_touch: `Get in touch to complete your booking`,
    byo_hint: `Priced activities can be booked now &mdash; on-request ones we&rsquo;ll quote you personally.`,
  },
  fr: {
    nav_stays: `Séjours`, nav_concierge: `Conciergerie`, nav_tours: `Excursions &amp; Parcs`, nav_family: `Notre famille`,
    foot_blurb: `Une collection familiale de maisons au Mexique, en Égypte et en Floride. Réservez en direct, payez en toute sécurité, vivez comme un roi.`,
    foot_explore: `Explorer`, foot_popular: `Casas populaires`, foot_experiences: `Expériences`, foot_company: `Entreprise`,
    foot_investors: `Investisseurs`, foot_loyalty: `Programme de fidélité`, foot_gift: `Cartes-cadeaux`, foot_list: `Proposer mon bien`,
    foot_support: `Aide`, foot_help: `Aide &amp; conditions`, foot_contact: `Contact`, foot_concierge: `Conciergerie sur WhatsApp`,
    foot_terms: `Conditions générales`, foot_privacy: `Confidentialité`, foot_cookies: `Cookies`,
    wa_title: `Discuter avec May`, wa_sub: `répond en quelques minutes`,
    fam_eyebrow: `Notre histoire`, fam_h1: `La famille derrière <span class="rosa">TutCasa.</span>`,
    fam_lede: `Un couple canado-égyptien qui a transformé son amour du voyage en un chez-soi pour chaque voyageur.`,
    fam_tag: `&#127796; Comment tout a commencé`, fam_story_h: `D’un seul condo à une <span class="em">collection soignée.</span>`,
    fam_p1: `TUT CASA est née d’une vision partagée par un couple canado-égyptien animé par une profonde passion pour le voyage et les expériences qui ont du sens. Ce qui a commencé comme une simple façon de louer notre condo à Playa del Carmen, au Mexique, est vite devenu bien plus grand.`,
    fam_p2: `Voyageurs passionnés, nous avons vu une opportunité sur le marché de la location de vacances : offrir des séjours fluides, raffinés et véritablement mémorables à nos voyageurs, tout en maximisant le rendement de nos propriétaires — sans le moindre tracas.`,
    fam_p3: `Aujourd’hui, TUT CASA propose une collection soignée de plus de 40 maisons à Mareazul, Playa del Carmen et au-delà, accueillant plus de 200 voyageurs satisfaits dans des expériences fluides, comme à la maison, pensées pour le confort, le style et les moments inoubliables.`,
    fam_sign: `— La famille TutCasa`,
    fam_stat1: `maisons dans notre collection soignée`, fam_stat2: `voyageurs satisfaits accueillis`, fam_stat3: `un accueil familial et impliqué`,
    fam_val_title: `Ce en quoi nous croyons`, fam_val_sub: `Chaque séjour doit être simple pour les voyageurs et rentable pour les propriétaires.`,
    fam_v1_h: `Simple &amp; raffiné`, fam_v1_p: `Des séjours soignés et sereins, du premier message au départ — sans surprise, sans friction.`,
    fam_v2_h: `Un vrai chez-soi loin de chez soi`, fam_v2_p: `Confort, style et ces petites attentions qui transforment une réservation en souvenir.`,
    fam_v3_h: `Les propriétaires aussi comptent`, fam_v3_p: `Nous maximisons le rendement de nos propriétaires avec des rapports transparents et une gestion clé en main — sans tracas.`,
    fam_cta_h: `Venez séjourner en famille.`, fam_cta_p: `Trouvez votre casa en quelques clics, ou confiez votre bien à des gens qui en prennent soin comme du leur.`,
    fam_cta_b1: `Trouver une casa`, fam_cta_b2: `Proposer mon bien`,
    st_h1: `Trouvez votre <span class="rosa">casa.</span>`, st_sub: `Parcourez toute notre collection de maisons au Mexique, en Égypte et en Floride.`,
    st_where: `Où`, st_addwhere: `Rechercher une destination`, st_where_ph: `Saisissez une ville ou un pays…`,
    st_checkin: `Arrivée`, st_checkout: `Départ`, st_who: `Qui`, st_addguests: `Ajouter des voyageurs`,
    st_adults: `Adultes`, st_children: `Enfants`, st_babies: `Bébés`, st_under2: `moins de 2 ans`, st_guests: `voyageurs`,
    st_t1a: `Meilleur tarif garanti`, st_t1b: `— toujours sous Airbnb`, st_t2: `Transfert aéroport gratuit`,
    st_t3: `Conciergerie WhatsApp incluse`, st_t4: `Excursions à prix partenaires`,
    st_results: `maisons disponibles`, st_allin: `Tous les prix sont tout compris — sans frais cachés`,
    st_none: `Aucune maison ne correspond à ces filtres. Essayez une autre destination.`,
    st_f_all: `Tous les séjours`, st_f_beach: `Bord de mer`, st_f_pool: `Piscine privée`, st_f_playa: `Playa del Carmen`,
    st_f_tulum: `Tulum`, st_f_nuba: `Nuba, Égypte`, st_f_florida: `Floride`, st_f_villas: `Villas`, st_f_pent: `Penthouses`, st_f_family: `Familial`,
    st_beds: `chambres`, st_showmap: `Voir l’emplacement`, st_details: `Voir les détails`, st_night: `/ nuit · tout compris`,
    exp_h1: `Explorer les expériences`, exp_sub: `Excursions, parcs et aventures dans la Riviera Maya et le Yucatán — à prix partenaires pour les voyageurs TutCasa.`,
    exp_explore: `Explorer`, exp_f_all: `Tout`, exp_f_water: `Mer &amp; récif`, exp_f_culture: `Culture &amp; ruines`, exp_f_adventure: `Aventure`, exp_f_parks: `Parcs`, exp_f_relax: `Détente &amp; VIP`,
    exp_cta_h: `Prêt à réserver une expérience ?`, exp_cta_p: `Chaque excursion est à prix partenaire — souvent bien en dessous des grands sites.`, exp_cta_b: `Voir les excursions &amp; tarifs`,
    list_h1: `Confiez votre bien à <span class="rosa">TutCasa.</span>`, list_sub: `Gagnez plus, sans souci. Nous gérons tout — voyageurs, ménage, tarifs et assistance — pendant que vous suivez le rendement.`,
    list_stat1: `taux d’occupation moyen`, list_stat2: `maisons gérées`, list_stat3: `assistance voyageurs`,
    list_form_h: `Parlez-nous de votre bien`, list_form_p: `Remplissez ce formulaire et notre équipe vous recontactera sous 24 heures.`,
    list_f_name: `Votre nom`, list_f_email: `Courriel`, list_f_phone: `Téléphone / WhatsApp`, list_f_loc: `Emplacement du bien`, list_f_type: `Type de bien`,
    list_f_beds: `Chambres`, list_f_baths: `Salles de bain`, list_f_guests: `Voyageurs max`, list_f_rate: `Tarif par nuit envisagé (optionnel)`,
    list_f_amen: `Équipements`, list_f_listed: `Est-il déjà listé quelque part ?`, list_f_msg: `Autre chose ?`, list_f_consent: `J’accepte d’être contacté par TutCasa au sujet de la gestion de mon bien.`,
    list_submit: `Envoyer mon bien`, list_req: `Veuillez remplir les champs obligatoires.`,
    list_success_h: `Merci ! &#127881;`, list_success_p: `Nous avons bien reçu les détails de votre bien. Un membre de la famille TutCasa vous recontactera sous 24 heures.`,
    list_why_h: `Pourquoi les propriétaires nous choisissent`, list_w1_h: `Gagnez plus`, list_w1_p: `Une tarification intelligente et des réservations directes pour un rendement net supérieur.`,
    list_w2_h: `Vraiment sans effort`, list_w2_p: `Voyageurs, ménage, arrivées, entretien et assistance 24/7 — tout est géré par nous.`,
    list_w3_h: `Rapports transparents`, list_w3_p: `Des relevés clairs et une vraie personne toujours joignable. Aucune surprise.`,
    list_type_condo: `Condo`, list_type_villa: `Villa`, list_type_pent: `Penthouse`, list_type_house: `Maison`, list_type_other: `Autre`,
    list_listed_airbnb: `Airbnb`, list_listed_vrbo: `Vrbo`, list_listed_both: `Les deux`, list_listed_no: `Pas encore`,
    list_am_pool: `Piscine`, list_am_parking: `Stationnement`, list_am_ac: `Climatisation`, list_am_wifi: `Wi-Fi`, list_am_gym: `Salle de sport`,
    list_choose: `Choisir…`,
    nav_back: `Retour`,
    home_aud_stay: `Trouver une casa`, home_aud_own: `Je possède une casa`,
    home_h1: `Trouvez votre casa en <span class="rosa">3 clics.</span>`,
    home_sub: `Fini le défilement sans fin. Dites-nous comment vous voyagez — nous trouverons la maison idéale. &#127796;`,
    home_guide: `Guidez-moi`, home_search: `Recherche`,
    home_eyb_fav: `COUPS DE CŒUR`, home_pop_casas: `Casas populaires`,
    home_eyb_book: `À RÉSERVER AVEC VOTRE SÉJOUR`, home_pop_exp: `Expériences populaires`,
    home_seeall_props: `Voir toutes nos propriétés &rarr;`, home_seeall_exp: `Voir toutes les expériences &rarr;`,
    home_familia_h: `Vous ne réservez pas une annonce. <span class="em">Vous séjournez avec nous.</span>`,
    home_loved: `Adoré par de vrais voyageurs`,
    exp_build_h: `Envie de quelque chose de vraiment unique ?`, exp_build_p: `Composez votre excursion privée et nous concevrons un itinéraire et un devis sur mesure — rien que pour vous.`,
    exp_build_b: `Composer mon excursion`,
    byo_h: `Composez votre programme`, byo_sub: `Partagez les détails de votre voyage et nous concevrons un itinéraire et un devis entièrement personnalisés — rien que pour vous.`,
    byo_trip: `DÉTAILS DE VOTRE VOYAGE`, byo_ci: `Arrivée`, byo_co: `Salida`, byo_adults: `Adultes`, byo_children: `Enfants`,
    byo_accom: `Hébergement`, byo_yes: `Oui`, byo_no: `Non`, byo_browse: `Touchez pour parcourir les activités`,
    byo_dream: `DE QUOI RÊVEZ-VOUS ?`, byo_dream_ph: `Dites-nous ce que vous aimeriez faire — ruines, plages, aventure, détente, une célébration spéciale…`,
    byo_pick: `Sélectionnez ce qui vous plaît — nous inclurons les prix exacts dans votre devis personnalisé.`,
    byo_submit: `Contactez-nous pour créer mon programme`, byo_onreq: `Sur demande`, byo_person: `MXN/pers.`,
    byo_ok_h: `Votre demande est envoyée ! &#127881;`, byo_ok_p: `Nous concevrons votre itinéraire et devis sur mesure et vous recontacterons sous 24 heures.`,
    list_am_tennis: `Courts de tennis`, list_am_spa: `Spa`, list_am_kids: `Aire de jeux`,
    list_f_photos: `Photos de votre bien (jusqu’à 20)`, list_photos_hint: `Glissez-déposez ou touchez pour ajouter — JPG ou PNG`,
    st_filters: `Filtres`, st_seeall: `Voir toutes les propriétés`, st_fil_price: `Prix max par nuit`, st_allin_s: `tout compris`,
    st_fil_beds: `Chambres`, st_fil_any: `Toutes`, st_fil_type: `Type &amp; équipements`, st_fil_clear: `Tout effacer`,
    st_fil_htype: `Type de logement`, st_fil_guests: `Voyageurs`, st_fil_city: `Emplacement`, st_fil_amen: `Équipements`,
    st_fil_opts: `Options de réservation`, st_opt_instant: `Réservation instantanée`, st_opt_selfci: `Arrivée autonome`, st_opt_pets: `Animaux acceptés`,
    st_am_pool: `Piscine`, st_am_jacuzzi: `Jacuzzi`, st_am_gym: `Salle de sport`, st_am_beach: `Plage / vue mer`,
    st_am_tennis: `Tennis &amp; pickleball`, st_am_kitchen: `Cuisine équipée`, st_am_washer: `Lave-linge / sèche-linge`, st_am_parking: `Parking`,
    st_am_wifi: `Wi-Fi`, st_am_ac: `Climatisation`,
    st_fil_show: `Voir`, st_fil_homes: `maisons`, st_match_your: `Vos correspondances`, st_match_in: `à`,
    pd_back: `Retour aux séjours`, pd_reviews: `avis`, pd_about: `À propos du logement`, pd_offers: `Ce que propose ce logement`,
    pd_know: `Bon à savoir`, pd_avail: `Disponibilité`, pd_caltip: `Touchez une date de début, puis une date de fin. Les jours barrés sont déjà réservés.`,
    pd_where: `Où vous serez`, pd_things: `À savoir`, pd_pernight: `/ nuit · tout compris`,
    pd_ci: `Arrivée`, pd_co: `Départ`, pd_guests: `Voyageurs`, pd_booknow: `Réserver`, pd_ask: `Écrire à May sur WhatsApp`,
    pd_nocharge: `Vous ne serez pas débité tout de suite · la conciergerie confirme chaque réservation`, pd_similar: `Logements similaires à aimer`,
    tt_sub: `Des aventures privées et guidées à la journée dans la Riviera Maya et le Yucatán. Choisissez votre date et la taille du groupe, puis l’excursion qui vous appelle — chaque excursion est entièrement privée, rien que pour votre groupe.`,
    byo_book: `Réserver maintenant`, byo_touch: `Contactez-nous pour finaliser votre réservation`,
    byo_hint: `Les activités avec prix peuvent être réservées maintenant — pour les autres, nous vous ferons un devis.`,
  },
  es: {
    nav_stays: `Estancias`, nav_concierge: `Conserjería`, nav_tours: `Tours y Parques`, nav_family: `Nuestra familia`,
    foot_blurb: `Una colección familiar de casas en México, Egipto y Florida. Reserva directo, paga seguro, hospédate como un rey.`,
    foot_explore: `Explorar`, foot_popular: `Casas populares`, foot_experiences: `Experiencias`, foot_company: `Empresa`,
    foot_investors: `Inversores`, foot_loyalty: `Programa de lealtad`, foot_gift: `Tarjetas de regalo`, foot_list: `Publicar mi propiedad`,
    foot_support: `Soporte`, foot_help: `Ayuda y políticas`, foot_contact: `Contacto`, foot_concierge: `Conserjería por WhatsApp`,
    foot_terms: `Términos y condiciones`, foot_privacy: `Privacidad`, foot_cookies: `Cookies`,
    wa_title: `Chatea con May`, wa_sub: `responde en minutos`,
    fam_eyebrow: `Nuestra historia`, fam_h1: `La familia detrás de <span class="rosa">TutCasa.</span>`,
    fam_lede: `Una pareja canadiense-egipcia que convirtió su amor por viajar en un hogar para cada tipo de viajero.`,
    fam_tag: `&#127796; Cómo empezó`, fam_story_h: `De un solo condominio a una <span class="em">colección cuidada.</span>`,
    fam_p1: `TUT CASA nació de una visión compartida por una pareja canadiense-egipcia con una profunda pasión por los viajes y las experiencias con significado. Lo que empezó como una forma de alquilar nuestro condominio en Playa del Carmen, México, pronto creció hasta convertirse en algo mucho más grande.`,
    fam_p2: `Como viajeros apasionados, vimos una oportunidad en el mercado de las rentas vacacionales: ofrecer estancias que se sienten sencillas, elevadas y verdaderamente memorables para nuestros huéspedes, maximizando a la vez el rendimiento de nuestros propietarios, sin complicaciones.`,
    fam_p3: `Hoy, TUT CASA ofrece una colección cuidada de más de 40 casas en Mareazul, Playa del Carmen y más allá, dando la bienvenida a más de 200 huéspedes satisfechos a experiencias fluidas, como un hogar fuera de casa, diseñadas para el confort, el estilo y los momentos inolvidables.`,
    fam_sign: `— La familia TutCasa`,
    fam_stat1: `casas en nuestra colección cuidada`, fam_stat2: `huéspedes satisfechos recibidos`, fam_stat3: `hospedaje familiar y cercano`,
    fam_val_title: `En qué creemos`, fam_val_sub: `Cada estancia debe ser sencilla para los huéspedes y rentable para los propietarios.`,
    fam_v1_h: `Sencillo y elevado`, fam_v1_p: `Estancias cuidadas y tranquilas, desde el primer mensaje hasta la salida, sin sorpresas ni fricciones.`,
    fam_v2_h: `Un verdadero hogar fuera de casa`, fam_v2_p: `Confort, estilo y esos pequeños detalles que convierten una reserva en un recuerdo.`,
    fam_v3_h: `Los propietarios también importan`, fam_v3_p: `Maximizamos el rendimiento de nuestros propietarios con informes honestos y gestión integral, sin complicaciones.`,
    fam_cta_h: `Ven a hospedarte con la familia.`, fam_cta_p: `Encuentra tu casa en unos clics, o publica tu propiedad con quienes la cuidan como propia.`,
    fam_cta_b1: `Encontrar una casa`, fam_cta_b2: `Publicar mi propiedad`,
    st_h1: `Encuentra tu <span class="rosa">casa.</span>`, st_sub: `Explora toda nuestra colección de casas en México, Egipto y Florida.`,
    st_where: `Dónde`, st_addwhere: `Buscar destinos`, st_where_ph: `Escribe una ciudad o país…`,
    st_checkin: `Entrada`, st_checkout: `Salida`, st_who: `Quién`, st_addguests: `Añadir huéspedes`,
    st_adults: `Adultos`, st_children: `Niños`, st_babies: `Bebés`, st_under2: `menores de 2`, st_guests: `huéspedes`,
    st_t1a: `Mejor tarifa garantizada`, st_t1b: `— siempre por debajo de Airbnb`, st_t2: `Transporte gratis del aeropuerto`,
    st_t3: `Conserjería por WhatsApp incluida`, st_t4: `Tours a precios de socio`,
    st_results: `casas disponibles`, st_allin: `Todos los precios son todo incluido, sin cargos ocultos`,
    st_none: `Ninguna casa coincide con estos filtros. Prueba otro destino.`,
    st_f_all: `Todas las estancias`, st_f_beach: `Frente al mar`, st_f_pool: `Piscina privada`, st_f_playa: `Playa del Carmen`,
    st_f_tulum: `Tulum`, st_f_nuba: `Nuba, Egipto`, st_f_florida: `Florida`, st_f_villas: `Villas`, st_f_pent: `Áticos`, st_f_family: `Familiar`,
    st_beds: `habitaciones`, st_showmap: `Ver ubicación`, st_details: `Ver detalles`, st_night: `/ noche · todo incluido`,
    exp_h1: `Explora experiencias`, exp_sub: `Tours, parques y aventuras por la Riviera Maya y Yucatán — a precios de socio para los huéspedes de TutCasa.`,
    exp_explore: `Explorar`, exp_f_all: `Todo`, exp_f_water: `Mar y arrecife`, exp_f_culture: `Cultura y ruinas`, exp_f_adventure: `Aventura`, exp_f_parks: `Parques`, exp_f_relax: `Relax y VIP`,
    exp_cta_h: `¿Listo para reservar una experiencia?`, exp_cta_p: `Cada tour es a precio de socio — normalmente muy por debajo de los grandes sitios.`, exp_cta_b: `Ver tours y precios`,
    list_h1: `Publica tu propiedad con <span class="rosa">TutCasa.</span>`, list_sub: `Gana más, preocúpate menos. Nos encargamos de todo — huéspedes, limpieza, precios y soporte — mientras tú ves el rendimiento.`,
    list_stat1: `ocupación promedio`, list_stat2: `casas gestionadas`, list_stat3: `soporte a huéspedes`,
    list_form_h: `Cuéntanos sobre tu propiedad`, list_form_p: `Completa esto y nuestro equipo te contactará en 24 horas.`,
    list_f_name: `Tu nombre`, list_f_email: `Correo`, list_f_phone: `Teléfono / WhatsApp`, list_f_loc: `Ubicación de la propiedad`, list_f_type: `Tipo de propiedad`,
    list_f_beds: `Habitaciones`, list_f_baths: `Baños`, list_f_guests: `Huéspedes máx`, list_f_rate: `Tarifa por noche que tienes en mente (opcional)`,
    list_f_amen: `Comodidades`, list_f_listed: `¿Está publicada en algún lado hoy?`, list_f_msg: `¿Algo más?`, list_f_consent: `Acepto que TutCasa me contacte sobre la gestión de mi propiedad.`,
    list_submit: `Enviar mi propiedad`, list_req: `Por favor completa los campos obligatorios.`,
    list_success_h: `¡Gracias! &#127881;`, list_success_p: `Hemos recibido los datos de tu propiedad. Un miembro de la familia TutCasa te contactará en 24 horas.`,
    list_why_h: `Por qué los propietarios nos eligen`, list_w1_h: `Gana más`, list_w1_p: `Precios inteligentes y reservas directas para un rendimiento neto mayor.`,
    list_w2_h: `Realmente sin esfuerzo`, list_w2_p: `Huéspedes, limpieza, entradas, mantenimiento y soporte 24/7 — todo lo gestionamos nosotros.`,
    list_w3_h: `Informes honestos`, list_w3_p: `Estados de cuenta claros y una persona real siempre disponible. Sin sorpresas.`,
    list_type_condo: `Condominio`, list_type_villa: `Villa`, list_type_pent: `Penthouse`, list_type_house: `Casa`, list_type_other: `Otro`,
    list_listed_airbnb: `Airbnb`, list_listed_vrbo: `Vrbo`, list_listed_both: `Ambos`, list_listed_no: `Todavía no`,
    list_am_pool: `Alberca`, list_am_parking: `Estacionamiento`, list_am_ac: `Aire acondicionado`, list_am_wifi: `Wi-Fi`, list_am_gym: `Gimnasio`,
    list_choose: `Elegir…`,
    nav_back: `Volver`,
    home_aud_stay: `Encontrar una casa`, home_aud_own: `Tengo una casa`,
    home_h1: `Encuentra tu casa en <span class="rosa">3 clics.</span>`,
    home_sub: `Sin scroll interminable. Dinos cómo viajas y te encontramos la casa ideal. &#127796;`,
    home_guide: `Guíame`, home_search: `Buscar`,
    home_eyb_fav: `FAVORITOS`, home_pop_casas: `Casas populares`,
    home_eyb_book: `RESERVA JUNTO A TU ESTANCIA`, home_pop_exp: `Experiencias populares`,
    home_seeall_props: `Ver todas nuestras propiedades &rarr;`, home_seeall_exp: `Ver todas las experiencias &rarr;`,
    home_familia_h: `No estás reservando un anuncio. <span class="em">Te hospedas con nosotros.</span>`,
    home_loved: `Amado por huéspedes reales`,
    exp_build_h: `¿Quieres algo totalmente a tu medida?`, exp_build_p: `Arma tu propio tour privado y diseñaremos un itinerario y cotización a medida — solo para ti.`,
    exp_build_b: `Armar mi propio tour`,
    byo_h: `Arma tu propio plan`, byo_sub: `Comparte los detalles de tu viaje y diseñaremos un itinerario y cotización totalmente a medida — solo para ti.`,
    byo_trip: `DETALLES DE TU VIAJE`, byo_ci: `Entrada`, byo_co: `Salida`, byo_adults: `Adultos`, byo_children: `Niños`,
    byo_accom: `Alojamiento`, byo_yes: `Sí`, byo_no: `No`, byo_browse: `Toca para explorar actividades`,
    byo_dream: `¿CON QUÉ ESTÁS SOÑANDO?`, byo_dream_ph: `Cuéntanos qué te encantaría hacer — ruinas, playas, aventura, relax, una celebración especial…`,
    byo_pick: `Selecciona lo que te llame la atención — incluiremos los precios exactos en tu cotización.`,
    byo_submit: `Contáctanos para armar mi plan`, byo_onreq: `Bajo petición`, byo_person: `MXN/persona`,
    byo_ok_h: `¡Tu solicitud está lista! &#127881;`, byo_ok_p: `Diseñaremos tu itinerario y cotización a medida y te contactaremos en 24 horas.`,
    list_am_tennis: `Canchas de tenis`, list_am_spa: `Spa`, list_am_kids: `Juegos para niños`,
    list_f_photos: `Fotos de tu propiedad (hasta 20)`, list_photos_hint: `Arrastra y suelta o toca para añadir — JPG o PNG`,
    st_filters: `Filtros`, st_seeall: `Ver todas las propiedades`, st_fil_price: `Precio máx por noche`, st_allin_s: `todo incluido`,
    st_fil_beds: `Habitaciones`, st_fil_any: `Todas`, st_fil_type: `Tipo y comodidades`, st_fil_clear: `Borrar todo`,
    st_fil_htype: `Tipo de casa`, st_fil_guests: `Huéspedes`, st_fil_city: `Ubicación`, st_fil_amen: `Comodidades`,
    st_fil_opts: `Opciones de reserva`, st_opt_instant: `Reserva instantánea`, st_opt_selfci: `Check-in autónomo`, st_opt_pets: `Mascotas permitidas`,
    st_am_pool: `Alberca`, st_am_jacuzzi: `Jacuzzi`, st_am_gym: `Gimnasio`, st_am_beach: `Playa / vista al mar`,
    st_am_tennis: `Tenis y pickleball`, st_am_kitchen: `Cocina completa`, st_am_washer: `Lavadora / secadora`, st_am_parking: `Estacionamiento`,
    st_am_wifi: `Wi-Fi`, st_am_ac: `Aire acondicionado`,
    st_fil_show: `Ver`, st_fil_homes: `casas`, st_match_your: `Tus coincidencias`, st_match_in: `en`,
    pd_back: `Volver a estancias`, pd_reviews: `reseñas`, pd_about: `Sobre este lugar`, pd_offers: `Lo que ofrece este lugar`,
    pd_know: `Bueno saber`, pd_avail: `Disponibilidad`, pd_caltip: `Toca una fecha de inicio y luego una de fin. Los días tachados ya están reservados.`,
    pd_where: `Dónde estarás`, pd_things: `Qué debes saber`, pd_pernight: `/ noche · todo incluido`,
    pd_ci: `Entrada`, pd_co: `Salida`, pd_guests: `Huéspedes`, pd_booknow: `Reservar`, pd_ask: `Escribe a May por WhatsApp`,
    pd_nocharge: `Todavía no se te cobrará · la conserjería confirma cada reserva`, pd_similar: `Casas similares que te encantarán`,
    tt_sub: `Aventuras privadas y guiadas de un día por la Riviera Maya y Yucatán. Elige tu fecha y el tamaño del grupo, luego el tour que más te llame — cada tour es totalmente privado, solo para tu grupo.`,
    byo_book: `Reservar ahora`, byo_touch: `Contáctanos para completar tu reserva`,
    byo_hint: `Las actividades con precio se pueden reservar ahora — las demás te las cotizamos personalmente.`,
  },
};

const STORAGE_KEY = "tc_lang";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** raw HTML string for a dict key (falls back to EN, then the key) */
  t: (k: string) => string;
  /** plain-text variant for attributes like placeholder (demo's data-i18n-ph) */
  tPh: (k: string) => string;
}

const Ctx = createContext<LangCtx>({
  lang: "en",
  setLang: () => {},
  t: (k) => I18N.en[k] ?? k,
  tPh: (k) => (I18N.en[k] ?? k).replace(/&hellip;/g, "…"),
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    // one-time sync from the URL/localStorage after hydration — SSR must
    // render EN, so this can't be useState's initializer
    const url = new URLSearchParams(window.location.search).get("lang");
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial = (url || stored || "en") as Lang;
    if (I18N[initial] && initial !== "en") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe init from an external store
      setLangState(initial);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    if (!I18N[l]) l = "en";
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback((k: string) => I18N[lang][k] ?? I18N.en[k] ?? k, [lang]);
  const tPh = useCallback((k: string) => (I18N[lang][k] ?? I18N.en[k] ?? k).replace(/&hellip;/g, "…"), [lang]);

  return <Ctx.Provider value={{ lang, setLang, t, tPh }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}

/**
 * Demo-equivalent of an element carrying data-i18n: renders the dict
 * string as innerHTML, exactly like the demo's applyLang().
 */
export function T({
  k,
  as: Tag = "span",
  className,
}: {
  k: string;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "div" | "a" | "b" | "small" | "label";
  className?: string;
}) {
  const { t } = useLang();
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: t(k) }} />;
}
