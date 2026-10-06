// Scripted strategies for tools/playtest.js. Each strategy has:
//   choices: scene id -> list of regexes tried in order against the available option titles
//   cards:   card/advisor ids in priority order (first available is played)
//   init:    optional per-sub-scene preferences are handled by 'choices' as well (keyed by scene id)
var common = {
  // sub-choices inside cards
  inter_party_relationships: [/Formalize/, /Talks with the SRs/, /Talks with the Left SRs/, /moderate Bolsheviks/],
  inter_party_relationships_formalize: [/The SRs/, /The Left SRs/, /The Bolsheviks/],
  fundraising: [/Ordinary dues/],
  rally: [/Unity of the whole democracy/, /eight-hour/, /Whatever/],
  media: [/Constituent Assembly/, /soviet democracy/, /Peace/],
  campaigning: [/railwaymen/, /factories/, /joint list/, /garrisons/],
  ideology: [/Hold the middle/],
  party_disunity: [/conference for everyone/, /Internationalists/, /Defencists/],
  shuffle_leadership: [/Internationalists/, /Defencists/],
  reichsbanner: [/Organise militias/, /Drill/, /Raise militias/],
  international_relations: [/Stockholm/, /Western socialists/, /protest/],
  peoples_party: [/Call the congress/],
  neorevisionism: [/Adopt the programme/],
  response_to_antisemitism: [/Organise defence/, /Confront/],
  labor_affairs: [/Legalise the factory committees/, /Arbitrate/],
  economic_policy: [/Enforce the monopoly/, /Raise the fixed price/],
  foreign_policy: [/Stockholm/, /Sound out Germany/, /new note/],
  agricultural_policy: [/land committees/, /state and Church/],
  military_policy: [/Trust the committees/, /Restore officers/],
  constitutional_reform: [/Demand an election/],
  nationalities: [/Ukrainian Rada/, /Transcaucasia/],
  police: [/answerable to the city dumas/, /workers' guards/],
  economic_democracy: [/Support the assemblies/, /Keep the party out/],
  labor_rights: [/Petition/, /compromise/],
  social_welfare: [/Expand cooperative/, /cooperative credit/],
  domestic_enemies: [/Send our members to the Red Army/, /prisoners are released/],
  judiciary: [/Use our contacts/, /European socialists/, /public campaign/],
  fiscal_policy: [/Join the committee/]
};

function merge(a, b) { var o = {}; for (var k in a) { o[k] = a[k]; } for (var j in b) { o[j] = b[j]; } return o; }

var democrat = {
  choices: merge(common, {
    february: [/Soviet government/, /Lead the Soviet/],
    peace_appeal: [/defencism/],
    april_theses: [/Kamenev/],
    april_crisis: [/coalition government/, /Press the government/],
    first_coalition: [/cabinet without Kadets/, /Enter/],
    may_crisis: [/Soviet parties alone/, /Keep the cabinet/],
    martov_returns: [/Bring him/],
    congress_of_soviets: [/take power/, /Back the coalition/],
    june_offensive: [/Withhold/],
    july_days: [/Shield/, /Call on loyal/],
    moscow_conference: [/Attend/],
    larin: [/Martov to speak/],
    kornilov: [/Committee/, /without the Kadets/],
    unity_congress: [/Concede/],
    democratic_conference: [/homogeneous/],
    october: [/Leniency/, /Stay in the hall/, /Walk out/],
    vikzhel: [/Sign/],
    constituent_assembly_election: [/united list/, /joint list/, /own lists/],
    party_congress: [/Martov/],
    cheka: [/Steinberg/],
    assembly_dispersed: [/Try to reconvene/, /Protest/],
    brest: [/joint defence/, /speaks against/],
    factory_reps: [/Endorse/],
    spring_elections: [/renounce/, /Accept the annulment/],
    komuch: [/Neither side/],
    georgia: [/model/],
    expelled: [/Pledge/, /Protest/],
    lsr_uprising: [/Warn/, /Defend/],
    red_terror: [/Bargain/, /Condemn/],
    october_line: [/Adopt Martov/],
    relegalised: [/Accept/],
    denikin: [/Mobilise/],
    labour_delegation: [/Speak openly/],
    congress_1920: [/Demand free/],
    kronstadt: [/Condemn/],
    nep: [/Claim/],
    alt_republic: [/federal/],
    vikzhel_check: [],
    peace_or_war: []
  }),
  cards: ['constitutional_reform', 'inter_party_relationships', 'agricultural_policy', 'foreign_policy', 'international_relations',
          'neorevisionism', 'peoples_party', 'campaigning', 'reichsbanner', 'domestic_enemies', 'judiciary', 'economic_policy', 'military_policy',
          'rally', 'media', 'labor_affairs', 'economic_democracy', 'social_welfare', 'party_disunity', 'fundraising', 'nationalities', 'police',
          'labor_rights', 'fiscal_policy', 'martov', 'liber', 'dan', 'broido']
};

var vikzhelist = {
  choices: merge(democrat.choices, {
    february: [/Lead the Soviet/],
    july_days: [/Shield/],
    october: [/Stay in the hall/, /Leniency/],
    vikzhel: [/Sign/]
  }),
  cards: ['inter_party_relationships', 'martov', 'international_relations', 'agricultural_policy', 'foreign_policy', 'campaigning', 'rally',
          'media', 'party_disunity', 'neorevisionism', 'peoples_party', 'judiciary', 'domestic_enemies', 'economic_policy', 'military_policy',
          'sukhanov', 'fundraising', 'economic_democracy', 'social_welfare', 'police', 'nationalities', 'liber', 'lidia']
};

var opposition = {
  choices: merge(democrat.choices, {
    february: [/Lead the Soviet/],
    first_coalition: [/Enter/],
    july_days: [/loyal troops/],
    kornilov: [/Committee/],
    democratic_conference: [/coalition/],
    october: [/Walk out/],
    vikzhel: [/Refuse/]
  }),
  cards: ['neorevisionism', 'peoples_party', 'inter_party_relationships', 'international_relations', 'domestic_enemies', 'judiciary', 'campaigning',
          'rally', 'media', 'economic_democracy', 'social_welfare', 'labor_rights', 'party_disunity', 'fundraising', 'fiscal_policy', 'martov', 'dan']
};

var whiteaid = {
  choices: merge(democrat.choices, {
    february: [/Lead the Soviet/],
    july_days: [/loyal troops/],
    democratic_conference: [/coalition/],
    october: [/Walk out/],
    vikzhel: [/Refuse/],
    assembly_dispersed: [/reconvene/],
    komuch: [/Join Komuch/],
    expelled: [/Go underground/, /Protest/],
    denikin: [/Stay neutral/],
    domestic_enemies: [/neither side/]
  }),
  cards: ['reichsbanner', 'campaigning', 'media', 'rally', 'inter_party_relationships', 'fundraising', 'party_disunity', 'economic_democracy', 'labor_rights', 'social_welfare']
};
module.exports = {democrat: democrat, vikzhelist: vikzhelist, opposition: opposition, whiteaid: whiteaid};
