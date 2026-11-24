import type { CorrespondenceArtefact } from "../../lib/correspondence/types.ts";

/**
 * Verbatim preservation of the original Hindi/Urdu Devanagari poem
 * extracted from the legacy PrizeSlideshow component (AU/II-001).
 * Spelling, punctuation, wording, and stanza breaks are intentionally untouched.
 */
export const ORIGINAL_FOR_YOU_POEM_TEXT = `तेरी आखों में जो देखा, वहाँ ठहरा है वक़्त,
ख़ुद को खोकर तुझमें मिल जाने की है चाहत।

बाहों की वो एक पनाह जो मुझको मिल गई,
उम्र भर का घर वहीं, मंज़िल वहीं ठहर गई।

जीना हो तेरे साथ तो हर साँस इबादत,
मरना भी तेरे साथ हो तो मौत भ राहत।

दो रूहें जब मिलें, बने इक जिस्म की सूरत,
मिट जाए फिर जीने-मरने की हर हद, हर सूरत।

तेरी नज़र का इक सुकून जो एक बार मिला,
उसके आगे जन्नत का ख़याल भी फीका लगा।

बस इतनी सी दआ है, इतनी सी है आरज़ू,
तेरे साथ जीना हो, तेरे साथ ही फ़ना हो जाना हो।`;

/**
 * Production Correspondence (`AU/II`) literary collection registry — First Edition (23 artefacts).
 *
 * Explicitly authorised by the author for public source inclusion in this repository.
 * Scalable data-driven registry: append future artefacts with the next unused AU/II-NNN
 * catalogue number without renumbering existing entries.
 *
 * Application-level publication and consent flags (`publishStatus` / `consentConfirmed`)
 * remain independently enforced by the passphrase-protected archive routes.
 */
export const CORRESPONDENCE_ARTIFACTS: readonly CorrespondenceArtefact[] = [
  {
    id: "correspondence-001",
    slug: "for-you-poem",
    catalogNumber: "AU/II-001",
    collectionOrder: 1,
    type: "poem",
    title: "For You",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    pairedArtifactSlug: "leela-poem-film",
    editorialNote:
      "Preserved verbatim from the earliest version of the archive.",
    originalTextSha256: "3fc9eafcb2c4f47287b2674dd1dfe07b98afac2c843418b67df90b85f2295b02",
    originalText: ORIGINAL_FOR_YOU_POEM_TEXT,
  },
  {
    id: "correspondence-002",
    slug: "poem-002",
    catalogNumber: "AU/II-002",
    collectionOrder: 2,
    type: "poem",
    title: "यादों का मौसम",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "94f8d644a90ca834b0afa5ba47946aef299f3612b20c20d747861a9d69ae4c78",
    originalText: `कुछ लोग मिलकर खो जाते हैं, कुछ रूह में बस जाते हैं,
जिसे भूलने की इल्तिजा की, वही हर दुआ में आती है।

मक़सद भी है, मोहब्बत भी है, उम्मीद का एक दिया भी,
फिर भी हर शाम ख़ामोशी मेरे घर चली आती है।

सुना था लोग मौसम हैं, आते हैं, बदल कर जाते हैं,
मौसम तो लौट आते हैं, पर जाने वाली फिर कब आती है?

मैं समझा था दर्द ही उसका रहना है, सो जलता रहा,
पर उसकी याद दर्द से नहीं, चाहत से साँस पाती है।

शायद वक़्त के साथ हर उदासी ढल जाती है,
जैसे हर रात आख़िर सुबह में बदल जाती है।`,
  },
  {
    id: "correspondence-003",
    slug: "poem-003",
    catalogNumber: "AU/II-003",
    collectionOrder: 3,
    type: "poem",
    title: "रक़ीब",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "fe5cc86ff806f7c12f38488703d8547ea4ba2cc31d6dba4768fdd6a93818aad5",
    originalText: `आज तुम सामने बैठे हो,
तुम, जिसे उसने चुना।
मैं ग़ुस्सा ढूँढ रहा हूँ, मिला नहीं।
तुम में कोई बुराई नहीं है,
यही सबसे बड़ी बुराई है।

मुझे शक उसकी मुस्कान से नहीं,
उस मुस्कान के बाद की ख़ामोशी से है,
जो दो लोगों के बीच बिना कुछ कहे बैठ जाती है।
वो ख़ामोशी अब तुम्हारी है।

एक बात पूछूँ?
जब वो बे-वजह हँसती है,
तुम वजह पूछते हो, या बस देखते रहते हो?
मैं देखता था।
तुम उसकी बातों का नशा जानते हो,
तो समझ सकते हो, इतने बरस बाद भी
मैं किस ख़ुमार में जी रहा हूँ।

मेरी हर दुआ का जवाब
ख़ुदा ने तुम्हारा पता लिख के दिया।
इसलिए बस इतना कहना है:
जो आँसू मैं उससे कभी नहीं पोंछ पाया,
वो तुम पोंछना,
और ध्यान रखना, वो तुम्हारी वजह से न हों।

मैं वही हूँ जो तुम्हारी जगह बैठना चाहता था,
इसलिए जानता हूँ, वो जगह कितनी क़ीमती है।
वो जगह अब तुम्हारी है, रक़ीब।`,
  },
  {
    id: "correspondence-004",
    slug: "poem-004",
    catalogNumber: "AU/II-004",
    collectionOrder: 4,
    type: "poem",
    title: "एहतिसाब",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "8dfc01e0c9770fc8db84614648a063358a1870cdc81a41c6f2dfa487074f2a61",
    originalText: `औरों की लकीरों का हर इक पास हिसाब है,
ख़ुद से जो माँग ले जवाब, वो एहतिसाब है।
दुनिया बदलने निकला था, लौटा तो ये खुला,
मंज़िल थी आईने में, सफ़र बेहिसाब है।

वादों की चाँदनी से इश्क़ पूरा नहीं होता,
ख़ता पे पर्दा डालना सबसे बड़ा नक़ाब है।

टूटा जो दिल किसी का मेरी ख़ामोशी से कभी,
अना उतार कर झुकना ही इश्क़ का आदाब है।

हवाओं को क़ुसूरवार कहना बहुत आसान है,
अपने बुझे चराग़ का सच ही असल जवाब है।

ज़मीर की अदालत में जो ख़ुद को खड़ा कर दे,
उसी की आँख से उतरता हर इक हिजाब है।

ख़ता तो मिट्टी की फ़ितरत है, फ़रिश्ता कौन है यहाँ, मानकर सुधर जाना ही असली सवाब है।`,
  },
  {
    id: "correspondence-005",
    slug: "poem-005",
    catalogNumber: "AU/II-005",
    collectionOrder: 5,
    type: "poem",
    title: "सुलगती यादें",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "4fad62566c2f38f186062524ab1f3af9e33a5a2d8399b7d16fa2911aa4461502",
    originalText: `दो डरों के बीच ठहरा हुआ हूँ मैं,
तुझे एक दफ़ा फिर से देख लूँ,
या ताउम्र तेरा चेहरा न देखूँ।
कौन सा डर ज़्यादा गहरा है,
ये फ़ैसला भी मुझसे नहीं होता।

दिल ज़िद करता है एक आख़िरी मुलाक़ात की,
और रूह कहती है, “बस, अब और नहीं।”
तेरी यादें रौशनी भी हैं और अलाव भी,
न खुद बुझती हैं, न मुझे चैन से जलने देती हैं।

इसी उधेड़बुन में सुलगती है हर रात मेरी,
तुझे फिर देखूँ या हमेशा के लिए भूल जाऊँ,
ये उलझन ही अब मेरी पहचान बन गई है।`,
  },
  {
    id: "correspondence-006",
    slug: "poem-006",
    catalogNumber: "AU/II-006",
    collectionOrder: 6,
    type: "poem",
    title: "मसला",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "ab1837393eec3a70351bf421ddf0adf0d95ba981cd6722e534bc120e13e7386d",
    originalText: `रात गुज़रती नहीं, सुबह भी पास आना नहीं चाहती,
आँख खुले भी तो, ये दुनिया अपनाना नहीं चाहती।
जो गुज़रे दिन थे, वो जीने का बहाना थे कभी,
अब वक़्त महज़ करता है, दिल जीना कहाँ चाहता है।

तुम आए तो लगा, साँसों में नया रंग उतर गया,
तुम गए तो लगा, जैसे सारा वजूद ही बिखर गया।
हँसी और अश्क, दोनों तुम्हारे ही नाम से जुड़े हैं,
मुस्कुराऊँ तो तुम याद आते हो, रोऊँ तो अक्स तुम्हारे खड़े हैं।

रोऊँ उस गुज़रे वक़्त पर, जो अब कभी लौटेगा नहीं,
या शुक्र करूँ मुक़द्दर का, कि वो पल मिला तो सही।
उन लम्हों को पछतावा कहूँ, या यादों में सँवारूँ,
हर पल एक सवाल बन ठहरा है, मैं ख़ुद को कैसे उबारूँ।

शायद दर्द और शुक्र, दोनों एक ही मुक़ाम पर रहते हैं,
जो बिछड़ गया, उसके होने की अहमियत वही तो कहते हैं।
न रोना पूरा मुनासिब लगे, न हँसना मुकम्मल सही,
बस इतना मान लूँ, उस साथ में कोई कमी न थी।

अब रात ढलेगी, सुबह भी आएगी, वक़्त की यही रीत है,
तुम यादों में महफ़ूज़ हो, बस इतनी सी मेरी जीत है।`,
  },
  {
    id: "correspondence-007",
    slug: "poem-007",
    catalogNumber: "AU/II-007",
    collectionOrder: 7,
    type: "poem",
    title: "मशरिक़",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "55647dd9dcf6eb887f94d76de7a8db592d0c2e0d0309567b5d384f13608a0306",
    originalText: `वो मेरी मशरिक़ थी, सुबह की पहली किरन,
जिसके आने से रोशन, हो जाता था ये मन।

आँखों में उसकी, एक नया ही जहाँ था,
हर नज़र में मोहब्बत, हर लफ़्ज़ में एहसान था।

मुस्कुराती थी तो लगता, वक़्त भी थम जाए,
कोई कैसे भला उसकी, वो मासूम अदा बताए।

उसकी सादगी में भी, क्या ग़ज़ब की शान थी,
हज़ारों की भीड़ में, वो एक अलग पहचान थी।

आज भी जब मैं, मशरिक़ की तरफ़ देखता हूँ,
उसी की चमक में, बस उसी का अक्स ढूँढता हूँ।

माना कि हम साथ नहीं, फ़ासले हैं इस कदर,
पर आज भी मेरे दिल पे, बस उसी का है असर।

ज़रूरी नहीं कि हर रिश्ता, मुकम्मल ही हो जाए,
कुछ लोग बस मिलते हैं, ताकि मोहब्बत सिखा जाएँ।`,
  },
  {
    id: "correspondence-008",
    slug: "poem-008",
    catalogNumber: "AU/II-008",
    collectionOrder: 8,
    type: "poem",
    title: "गुलाम",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "c1b150328eadf21a8587581e309e51a15fdecb47f03ea4e8c29aa21c0e04a4b6",
    originalText: `यादों की गुलामी में भी, एक अजीब सुकून है,
ज़ंजीरें हैं तेरी ही, फिर भी दिल ये मज़बूर है।
तेरी हँसी की गूँज अब तक, कानों में बसी है,
जैसे कोई राग अधूरा, पर धुन पूरी सजी है।

बातें तेरी याद आएँ, तो होंठों पे मुस्कान हो,
लम्हे वही जो चुभें कभी, तो आँखें नम, बेज़ान हों।
ये गुलामी दर्द भी है, और ये गुलामी चैन भी,
मैं आज़ाद होना चाहूँ, पर बेचैन हैं ये नैन भी।

तू चली गई या रुक गई, वक़्त तो आगे बढ़ा,
मैं आज भी वहीं खड़ा हूँ, जहाँ तेरा साया पड़ा।
कह दो इसे तुम मजबूरी, या कह दो इसे चाहत,
मैं यादों का ग़ुलाम रहूँगा, यही है मेरी इबादत।`,
  },
  {
    id: "correspondence-009",
    slug: "poem-009",
    catalogNumber: "AU/II-009",
    collectionOrder: 9,
    type: "poem",
    title: "ख़्वाहिश",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "555c5c068185c4156c8636e131fc9bc7edbc830f5ef1ec22714b60d70ec9a546",
    originalText: `दुआ है मेरी कि वो सदा आबाद रहे,
ख़ुशी उसके चेहरे का हर पल लिबास रहे।
मगर ये अंदेशा ही दिल को चीर जाता है,
कि कोई और अब उसे इस कदर हँसाता है।

किसी और की बातों पे जब वो शर्माती होगी,
हया से जब पलकें उसकी झुक जाती होंगी।
तसव्वुर से ही जान निकल जाती है मेरी,
रगों में बहती है बस अब लाचारी मेरी।

लोग कहते हैं अक्सर, “जो है, बस यही है”,
कि दुनिया में बिछड़ने की रीत तो बनी है।
पर इस दर्द-ए-हिज्र से गुज़रना है क़यामत,
हर रोज़ टूट कर बिखरना नहीं है मेरी आदत।

बस एक ख़्वाहिश है कि वो मेरी बाँहों में लौट आए,
मेरी सूनी दुनिया को वो फिर से महकाए।
उसे सीने से लगा लूँ मैं कुछ इस तरह अब,
कि ताउम्र उसे ख़ुद में महफ़ूज़ कर लूँ मैं।`,
  },
  {
    id: "correspondence-010",
    slug: "poem-010",
    catalogNumber: "AU/II-010",
    collectionOrder: 10,
    type: "poem",
    title: "रौशनी की दहलीज़",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "194ea55239d97d247370e67d045e6c901bed5522483416303a53572eef0a705b",
    originalText: `इक तारीक सा रास्ता है, और मैं चलता जा रहा हूँ,
हाथों में इश्क़ का साज़ लिए, बस आगे बढ़ता जा रहा हूँ।
मुक़द्दर ने कहा था, गुज़रे वक़्त से कोई लौट कर नहीं आता,
पर तुम्हारी रूह को मैं अंधेरों से भी खींच कर ला रहा हूँ।

शर्त ये थी कि इस सफ़र में, मैं पीछे मुड़कर ना देखूँ,
शक का एक लम्हा भी, हमारी इस दास्तान को मिटा देगा।
मैं तुम्हारे क़दमों की आहट को धड़कनों में सुनता हूँ,
मुझे यक़ीन है, मेरा ये सब्र तुम्हें वापस मुझे दिला देगा।

ज़िंदगी के इस तवील अँधेरे में, मैं बिना रुके बढ़ा हूँ,
तुम मेरे साथ महफ़ूज़ हो, इसी वादे पे अड़ा हूँ।
कभी ख़याल आता है, एक बार पलट कर देख लूँ?
क्या सच में तुम हो वहाँ, या मैं सिर्फ़ एक भरम में खड़ा हूँ?

मगर नहीं, मेरे इश्क़ की बुनियाद इतनी कमज़ोर नहीं,
मेरे यक़ीन के धागों में, किसी शक की कोई डोर नहीं।
मैं चलता रहूँगा उस वक़्त तक, जब तक सवेरा ना आ जाए,
तुम्हें पाने के सिवा, मेरी मंज़िल का कोई और छोर नहीं।

और जब ये रात ख़त्म होगी, रौशनी दहलीज़ पर आएगी,
मैं पलटूँगा, और तुम्हारी तस्वीर धुंध में नहीं खोएगी।
तुम खड़ी होगी वहाँ, एक हक़ीक़त बन कर मेरी,
और मेरी दुनिया, फिर से तुम्हारी बाँहों में सिमट जाएगी।`,
  },
  {
    id: "correspondence-011",
    slug: "poem-011",
    catalogNumber: "AU/II-011",
    collectionOrder: 11,
    type: "poem",
    title: "तू ही काफ़ी है",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "80ec70433bd090d03c74774a3119835561004770df81acbec8b0cd4f8006514e",
    originalText: `किसी और को देखूँ कैसे,
जब नज़र में बसे हो तुम,
हर आँख झुकी, हर राह मुड़ी,
हर मंज़िल पे मिले हो तुम।

जागते हुए तुम, सोते हुए तुम,
साँसों में तुम, ख़्वाबों में तुम,
दिन के उजालों में, शाम के धुंधलके में,
हर लम्हे में साथ हो तुम।

उम्र भर देखता रहूँ तुम्हें,
यही दुआ है, यही चाहत है,
न चाहिए कोई और मंज़र मुझे,
बस तेरी एक झलक, इबादत है।

दुनिया भी दे दे कोई मुझको,
तो भी मेरा रुख़ होगा तुम्हारी तरफ़,
क्योंकि जो सुकून है तुम्हें देखने में,
वो कहीं नहीं मिलता, किसी तरफ़।

तू ही काफ़ी है, बस तू ही काफ़ी है।`,
  },
  {
    id: "correspondence-012",
    slug: "poem-012",
    catalogNumber: "AU/II-012",
    collectionOrder: 12,
    type: "poem",
    title: "मेरा आख़िरी दीन",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "b00d1244673b760e74d07756bf803cc76faa69c2c1a03cb24adb7c1595e5cb96",
    originalText: `मौत जब आएगी कंधे पे हाथ धर के,
और पूछेगी, चलोगे?

तो मैं कहूँगा,
एक पल दे मुझे।

न जन्नत माँगूँगा,
न बख़्शिश माँगूँगा किसी ख़ुदा से,
बस एक नज़र,
उसकी,
जो शायद जानती भी नहीं
कि मेरी रूह में
किस तरह रहती है।

जिस्म जाने दो,
साँसें जाने दो,
पर वो जो तस्वीर है,
आँखों के पीछे कहीं कैद,
वो रहे।

अंधेरा आए तो आए,
पर पहले,
एक बार वो चेहरा।

बस यही है मेरा दीन,
बस यही है मेरी नमाज़,
बस यही है
मेरा आख़िरी घर।`,
  },
  {
    id: "correspondence-013",
    slug: "poem-013",
    catalogNumber: "AU/II-013",
    collectionOrder: 13,
    type: "poem",
    title: "ख़्वाबों की आग़ोश",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "a8fbcead3ee8415816acefab6107d302ae0806f89b7bd87801fad264fed6049b",
    originalText: `मैंने इख़्तियार की है ख़ामोशी, तेरी मुहब्बत के लिए,
कि इन ख़ामोशियों में मुझे कभी इनकार नहीं मिलता।
मैंने चुन ली है तन्हाई, तुझसे इश्क़ करने को,
कि मेरी तन्हाइयों में, कोई और तेरा हक़दार नहीं होता।

मैंने इबादत की है तेरी, फ़ासलों की सरहदों से,
कि ये दूरियाँ ही मुझे मुकम्मल टूटने से बचा लेती हैं।
मैंने अकीदत से चूमा है तुझे, इन बहती हवाओं में,
कि इन हवाओं में, मेरे लबों से भी ज़्यादा नज़ाकत है।

और मैंने थाम रखा है तुझे, अपने ख़्वाबों की आग़ोश में,
कि मेरे इन ख़्वाबों में, तेरा कोई अंजाम नहीं होता।`,
  },
  {
    id: "correspondence-014",
    slug: "poem-014",
    catalogNumber: "AU/II-014",
    collectionOrder: 14,
    type: "poem",
    title: "हैरत-ए-इश्क़",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "4b0c528baac120e9b23ec17ca127de1cfb28e8e671901b944743a4b24ee19e45",
    originalText: `सोचा था अब दिल किसी से लगाएंगे नहीं,
इश्क़ की इन गलियों में फिर जाएँगे नहीं।
पर तुम्हारी आमद ने एक हैरत सी जगा दी,
मेरी हर क़सम, मेरे अंदर की हर दीवार गिरा दी।

ये गहराई मेरी ख़ुद की समझ से बाहर है,
मैं ख़ुद हैरान हूँ, कैसा ये अजीब प्यार है।
कभी सोचा ना था कोई ज़ेहन पे यूँ छा जाएगा,
सोते जागते बस तुम्हारा ही ख़याल आएगा।

डरता हूँ इस बेख़ुदी से मैं कभी कभी,
ऐसी जुनूनियत ज़िंदगी में देखी ना थी कभी।
तुम बिन एक लम्हा भी सदियों सा लगता है,
मेरा वजूद बस तुम्हारे ही आस-पास ठहरता है।

मैं इतना ना-समझ नहीं था कि ऐसे ख़्वाब बुनता,
कि एक ही शख़्स में मैं मुकम्मल दुनिया चुनता।
पर तुम में हसीन अदा और दिलकश नादानियाँ हैं,
तुम्हारी दानाई में भी बच्ची सी मासूमियतें हैं।

ख़ूबसूरत, अकलमंद, और थोड़ी सी पगली हो तुम,
मेरे हर टूटे हुए ख़्वाब की इकलौती तसल्ली हो तुम।
अब बस यही ख़्वाहिश है कि तुम्हारे पास रहूँ,
तुम्हें सुनूँ, तुम्हें देखूँ, और सब कुछ तुमसे कहूँ।`,
  },
  {
    id: "correspondence-015",
    slug: "poem-015",
    catalogNumber: "AU/II-015",
    collectionOrder: 15,
    type: "poem",
    title: "किस्मत नहीं, फ़ैसला",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "7974c282f2121b2a8664e0d51b3d2e2e066ccca4b82a40187495700f651e3483",
    originalText: `अगर तुम पूछो कि मेरे लिए प्यार क्या है?
तो सुनो, प्यार सिर्फ़ तुम्हें चुनना है।
ज़िंदगी चाहे कितनी भी लंबी क्यों ना हो,
हर जनम में, हर सफ़र में, बस तुम्हें ही चुनना।

एक बार नहीं, हज़ार बार, लाख बार,
बिना डरे, बिना शर्त के, सिर्फ़ तुम्हें चुनना।
जब पूरी दुनिया हमारे ख़िलाफ़ हो,
जब सारे रास्ते बंद हो जाएँ और अंधेरा छा जाए,
तब भी सारी दुनिया से लड़कर,
अपने हाथों में सिर्फ़ तुम्हारा हाथ चुनना।

मेरे लिए प्रेम किस्मत का कोई खेल नहीं,
यह मेरा फ़ैसला है, मेरा वादा है।
मैं तुम्हें चुनूँ, और तुम मुझे चुनो,
बस यही सच्चा प्यार है।`,
  },
  {
    id: "correspondence-016",
    slug: "poem-016",
    catalogNumber: "AU/II-016",
    collectionOrder: 16,
    type: "poem",
    title: "रेत की इमारतें",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "cf8c53fefe05215f0507ad99603783141dc81a04ff178f195fcedad4db1b78fb",
    originalText: `अगर आज यहाँ मेरी साँसें ठहर जाएँ,
तो पीछे मुड़कर देखने को कुछ भी नहीं है।
उम्र भर की दौड़-धूप का हासिल है सिर्फ़,
मेरी हस्ती का कोई नाम-ओ-निशाँ नहीं है।

चाँद को छूने की ज़िद थी, सितारों तक भी ना जा सका,
सितारों की तरफ़ जो बढ़ा, तो मुँह के बल आ गिरा।
ख़्वाबों की इमारतें सब रेत की निकलीं,
मैंने अपनी हर कोशिश में ख़ुद को नाकाम ही पाया।

अब तो कुछ दिन बस बिस्तर में पिघल जाने को जी करता है,
ना कोई आवाज़ आए, ना किसी से कोई बात हो।
बस ख़ुद में सिमट कर, एक ख़ामोशी ओढ़ लूँ
इस शोर से दूर, जैसे बस मेरे वजूद की रात हो।

मैं इस कायनात का एक बे-मायने सा ज़र्रा हूँ,
जिसने इस दुनिया को कभी कुछ नहीं दिया।
मेरे होने या मिट जाने से क्या ही बदलेगा यहाँ?
मैंने अपनी ज़िंदगी को बस एक खाली पन्ने सा जिया।`,
  },
  {
    id: "correspondence-017",
    slug: "poem-017",
    catalogNumber: "AU/II-017",
    collectionOrder: 17,
    type: "poem",
    title: "बचाव",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "caef22b888c9df1a95db2f3928099d9a6a1687f6ae4ae66781777bc63b5b1511",
    originalText: `सुना है लोग खुशियों से इस क़दर डरते हैं,
मुकम्मल होने से पहले ही कहानी तबाह करते हैं।
मैं अपनी बात नहीं करता, बस एक हक़ीक़त बतलाता हूँ,
इंसान के ज़ेहन की इस अजीब कशमकश को दिखाता हूँ।

जब लगता है कोई शख़्स हद से ज़्यादा अज़ीज़ होने लगा है,
जब लगता है ज़िंदगी में सुकून का बीज बोने लगा है।
तो लोग ब-ज़ाहिर ख़ुद ही उस फ़सल को आग लगा देते हैं,
बनने से पहले ही अपने आशियाने ख़ुद गिरा देते हैं।

क्यूँकि कल को जब वो बिछड़ेंगे, तो अज़ीयत (दर्द) ज़्यादा होगी,
आदत बन कर छूटेगा जब कोई, तो तकलीफ़ और सारा होगी।
इस डर से कि वक़्त उनसे उनका क़ीमती ख़ज़ाना छीन लेगा,
वो ख़ुद ही अपने हाथों से अपने ख़्वाबों का क़त्ल करते हैं।

उन्हें लगता है इस तबाही पे सिर्फ़ उनका अपना इख़्तियार है,
दरअसल ये गुज़रे हुए सदमों की बनाई एक दीवार है।
किनारा जब बिल्कुल सामने हो, तो कश्ती ख़ुद डुबा देते हैं,
बाद के गहरे ज़ख़्मों से बचने को ख़ुद को आज ही रुला देते हैं।

मेरा हाल नहीं है ये, मैं तो बस इस रवैये को जानता हूँ,
ख़ुशी खोने के डर से हारे इंसान की, इस फ़ितरत को पहचानता हूँ।`,
  },
  {
    id: "correspondence-018",
    slug: "poem-018",
    catalogNumber: "AU/II-018",
    collectionOrder: 18,
    type: "poem",
    title: "बे-निशाँ",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "6148bd493cd9def4acf9d7483f87c1c410d2e0d5823d6862b256825ce43d6790",
    originalText: `तेरी महफ़िल को सजा कर, मैं निकल जाऊँगा,
ख़ुद को एक ख़्वाब बना कर, मैं निकल जाऊँगा।
मेरी परछाईं का भी तुझपे न साया ही पड़े,
सारे निशानों को मिटा कर, मैं निकल जाऊँगा।

तुझको मंज़िल हो मुबारक, मैं मुसाफ़िर ही भला,
तेरी राहों से गुज़र कर, मैं निकल जाऊँगा।
रौशनी तेरे मुक़द्दर में रहे ता-उम्र,
अपनी हस्ती को जला कर, मैं निकल जाऊँगा।

कुछ घड़ी रुकने की बस आख़िरी मोहलत दे दे,
अपनी आँखों को झुका कर, मैं निकल जाऊँगा।
मैं कोई अश्क़ नहीं हूँ जो छलक जाऊँगा,
तेरी पलकों पे ठहर कर, मैं निकल जाऊँगा।`,
  },
  {
    id: "correspondence-019",
    slug: "poem-019",
    catalogNumber: "AU/II-019",
    collectionOrder: 19,
    type: "poem",
    title: "एक आवाज़ का इंतज़ार",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "ed051654ba60e4008628446f793a30a2a49161974f525ea6bb1abdbee61a6baf",
    originalText: `मुद्दतों तक तन्हा रहा, पर कभी अकेलापन न खला,
अपनी ही धुन में मगन था, दिल कभी ऐसे न जला।
भीड़ से दूर, अपनी ही दुनिया में मुकम्मल था मैं,
अकेले चलने का आदी था, किसी का मोहताज कहाँ था मैं।

फिर तुम मिले, और इस कदर रूह के दरमियाँ आ गए,
मेरी हर एक धड़कन, मेरी हर साँस पे तुम छा गए।
तुम्हारी कुर्बत की ऐसी आदत लगी, कि ख़ुद से बेगाना हुआ,
पर जब से तुमने ख़ामोशी ओढ़ी, मेरा वजूद ही वीराना हुआ।

उम्र भर के अकेलेपन ने कभी मुझे रुलाया न था,
जो दर्द तेरी इस चुप्पी ने दिया, वो कभी सामने आया न था।
तुम्हारा यूँ बात न करना, अब बर्दाश्त के बाहर है,
एक जानलेवा सन्नाटा, अब मेरी रातों का पहर है।

जिन नाकाम आशिक़ों के क़िस्सों पर मैं कभी मुस्कुराता था,
सोचता था, क्यों कोई किसी के लिए ख़ुद को यूँ मिटाता था?
आज देखो, मैं भी उन्हीं बे-आस दीवानों की कतार में हूँ,
एक हारी हुई बाज़ी हूँ, बस तेरी एक आवाज़ के इंतज़ार में हूँ।`,
  },
  {
    id: "correspondence-020",
    slug: "poem-020",
    catalogNumber: "AU/II-020",
    collectionOrder: 20,
    type: "poem",
    title: "मोहब्बत की पहचान",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "501aefcad206c79db858c3bb5ea02f7055cb9e84d0327ed7c601c0253720491e",
    originalText: `न कोई पास आया, न कोई सदा दी,
न आँखों ने देखा, न दिल ने दुआ दी।

ये कैसा सफ़र है, ये कैसी घड़ी है,
जहाँ रौशनी है, मगर कुछ कमी है।

मोहब्बत का मतलब समझा नहीं मैं,
ये अल्फ़ाज़ सुने हैं, पर जाना नहीं मैं।

कभी चाँदनी में ये बातें सुनी थीं,
कि दिल की ज़ुबाँ में कुछ रातें बुनी थीं।

मगर जब भी देखा तो ख़ाली नज़र आई,
ये दुनिया है ज़िंदा, मगर रूह थक गई।`,
  },
  {
    id: "correspondence-021",
    slug: "poem-021",
    catalogNumber: "AU/II-021",
    collectionOrder: 21,
    type: "poem",
    title: "तेरा नूर",
    language: "hi",
    script: "Devanagari",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "cdd91fe7722f99ea4d55c9808024eff8781dafeb5284c21c702be73f2db3d5a9",
    originalText: `हवाओं में बसता है नाम
तेरा,
फ़िज़ाओं में घुला है सुरूर
तेरा।
तेरे ख़यालों का चिराग़
जलता है,
हर लम्हा, हर साँस मेरा।

तेरे बिना ये रात अधूरी,
तेरे बिना ये दिल भी
मजबूर।
तेरे लम्स का जो एहसास
है,
वो चाँदनी में जैसे चाँद
का नूर।

तेरे हुस्न का हर रंग
बेमिसाल,
तेरी मुस्कान में छुपी है
कहानी।
आँखों की शरारत भी कुछ
कहती है,
तेरी ख़ामोशी में छुपी है
रवानी।`,
  },
  {
    id: "correspondence-022",
    slug: "poem-022",
    catalogNumber: "AU/II-022",
    collectionOrder: 22,
    type: "poem",
    title: "Saudade",
    language: "en",
    script: "Latin",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "24d9f1dee24374f649b31932a5e042af6b616ca77df0a01ca2aa94650179603c",
    originalText: `This heart still remembers the warmth of your hand, the shape of our footprints pressed deep in the sand.

The years are an ocean, the days are the tide, but time cannot wash what the heart keeps inside.

There's a saudade that stirs in the small hours of night, a sweet, aching ghost at the edge of the light.

It hums the old song that time couldn't hold, before the last warmth of that summer grew cold.

The world rushes onward, the cold winters blow, but under the ashes the embers still glow.

Though miles lie between us and paths may sever, this heart still remembers, and keeps you forever.`,
  },
  {
    id: "correspondence-023",
    slug: "poem-023",
    catalogNumber: "AU/II-023",
    collectionOrder: 23,
    type: "poem",
    title: "Izel",
    language: "en",
    script: "Latin",
    publishStatus: "ready",
    consentConfirmed: true,
    originalTextSha256: "617a7b545294c1278c4d6396499a77a49950f88def47b2ec09da595c5fc6ee4e",
    originalText: `Izel is the word I keep for you,

A quiet promise, and a true one too

Time may unroll its scroll through every age,

Yet never write a second on your page.

Your laughter softens air, and I am healed

By a quiet warmth no other life has sealed

Let seasons turn and all things start anew,

Still, there is no one, in any life, like you.`,
  },
];
