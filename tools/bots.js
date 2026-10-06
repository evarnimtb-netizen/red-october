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
var srCommon = {
  february: [/Demand a Soviet government/, /Back Kerensky/],
  april_theses: [/joint programme on the land/, /Chernov replies/],
  first_coalition: [/cabinet without Kadets/, /Chernov takes Agriculture/],
  sr_chernov_land: [/Legalise/, /Regulate/],
  sr_left_wing: [/larger place/],
  sr_chernov_leaves: [/Keep him in/],
  sr_peasant_congress: [/Hold the Congress/],
  sr_left_split: [/Reconcile/, /Let them go/],
  brest: [/Vote against/, /Abstain/],
  sr_komuch: [/Refuse/, /guarantees/],
  kolchak: [/Pull out/, /Stay in/],
  sr_ufa: [/Adopt the Ufa/],
  sr_congress_1920: [/Demand free/],
  nep: [/peasants' victory/],
  land_committees: [/Draft a land socialisation/, /Back the committees/],
  peasant_congress: [/Call a congress/, /village committees/, /rural cooperatives/],
  peasant_meeting: [/Land and freedom/, /Whatever/],
  people_army: [/Reject armed/, /self-defence/],
  media: [/Land and Freedom/, /Constituent Assembly/],
  campaigning: [/villages/, /railwaymen/, /garrisons/]
};
var sr_land = {
  choices: merge(merge(democrat.choices, srCommon), {
    sr_komuch: [/Refuse/], october: [/Leniency/, /Stay in the hall/, /Walk out/], vikzhel: [/Sign/]
  }),
  cards: ['land_committees', 'constitutional_reform', 'agricultural_policy', 'peasant_congress', 'inter_party_relationships', 'foreign_policy',
          'international_relations', 'campaigning', 'peasant_meeting', 'media', 'economic_policy', 'military_policy', 'chernov', 'gots', 'zenzinov',
          'party_disunity', 'fundraising', 'domestic_enemies', 'judiciary', 'economic_democracy', 'social_welfare', 'rally']
};
var sr_komuchbot = {
  choices: merge(merge(opposition.choices, srCommon), {
    february: [/Back Kerensky/], first_coalition: [/Chernov takes Agriculture/], october: [/Walk out/], vikzhel: [/Refuse/],
    sr_komuch: [/Join Komuch, and raise/], kolchak: [/Stay in/], sr_ufa: [/Let the Ufa/], denikin: [/Stay neutral/], people_army: [/Raise the People/]
  }),
  cards: ['people_army', 'land_committees', 'peasant_congress', 'campaigning', 'peasant_meeting', 'media', 'inter_party_relationships', 'fundraising', 'volsky']
};
var sr_peasant = {
  choices: merge(merge(opposition.choices, srCommon), {
    inter_party_relationships: [/moderate Bolsheviks/],
    february: [/Back Kerensky/], first_coalition: [/Chernov takes Agriculture/], october: [/Walk out/], vikzhel: [/Refuse/],
    sr_komuch: [/Refuse/], sr_ufa: [/Adopt the Ufa/], denikin: [/Mobilise/], expelled: [/Pledge/]
  }),
  cards: ['peasant_congress', 'land_committees', 'inter_party_relationships', 'domestic_enemies', 'judiciary', 'campaigning', 'peasant_meeting', 'media',
          'social_welfare', 'economic_democracy', 'fundraising', 'party_disunity', 'international_relations', 'gots', 'zenzinov']
};
var lsrCommon = {
  april_theses: [/Welcome the land and peace/],
  june_offensive: [/Oppose the offensive/, /committees against/],
  july_days: [/mediate/i, /Shield/, /sailors/],
  kornilov: [/Send the Kronstadt sailors/, /Committee/],
  democratic_conference: [/Walk out/],
  october: [/Join the Bolsheviks/, /Stay in the hall/],
  constituent_assembly_election: [/separate Left SR lists/, /own lists/],
  assembly_dispersed: [/Defend the dispersal/, /Protest/],
  brest: [/Stay in the government/, /Vote for ratification/, /Leave the government/],
  lsr_july: [/Call it off/, /Protest the treaty/],
  lsr_oct18: [/hold the party together/i],
  lsr_government: [/Enter the government/],
  lsr_cheka: [/Take the four seats/],
  lsr_start: [/caucus/],
  lsr_coalition: [/Oppose the coalition/, /Vote with the majority/],
  lsr_congress: [/all socialist parties/, /Vote with the Bolsheviks/],
  lsr_split_nov: [/founding congress/],
  inside_sr: [/caucus/, /Win over/, /speaking tour/],
  the_split: [/November/, /Stay, and fight/],
  sovnarkom_seats: [/Defend the party's seats/, /land redistribution/, /legality/],
  cheka_board: [/Use the seats to slow/, /Investigate/],
  inter_party_relationships: [/moderate Bolsheviks/],
  peasant_congress: [/Call a congress/, /village committees/],
  peasant_meeting: [/Land and freedom/, /Whatever/],
  media: [/Land and Freedom/, /Constituent Assembly/],
  campaigning: [/villages/, /railwaymen/],
  expelled: [/Protest/],
  red_terror: [/Bargain/, /Condemn/],
  denikin: [/Mobilise/],
  kronstadt: [/Condemn/, /Stay silent/],
  nep: [/Demand political/, /Claim/]
};
var lsr_coalition_bot = {
  choices: merge(democrat.choices, lsrCommon),
  cards: ['inter_party_relationships', 'sovnarkom_seats', 'cheka_board', 'inside_sr', 'the_split', 'peasant_congress', 'spiridonova', 'natanson', 'steinberg', 'kolegaev', 'campaigning', 'peasant_meeting', 'media', 'party_disunity', 'fundraising', 'domestic_enemies', 'judiciary']
};
var lsr_rising_bot = {
  choices: merge(democrat.choices, merge(lsrCommon, { lsr_july: [/Carry out/], brest: [/Leave the government/], lsr_government: [/Stay outside/] })),
  cards: ['inside_sr', 'the_split', 'peasant_congress', 'campaigning', 'peasant_meeting', 'media', 'kamkov', 'spiridonova']
};
module.exports = {lsr_coalition: lsr_coalition_bot, lsr_rising: lsr_rising_bot, sr_land: sr_land, sr_komuch: sr_komuchbot, sr_peasant: sr_peasant, democrat: democrat, vikzhelist: vikzhelist, opposition: opposition, whiteaid: whiteaid};
