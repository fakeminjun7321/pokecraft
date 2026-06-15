// ===== content.js : 블록/아이템 정의, 텍스처 아틀라스, 아이콘, 조합법 =====
'use strict';

// ----- 블록 ID -----
const B = {
  AIR:0, GRASS:1, DIRT:2, STONE:3, COBBLE:4, BEDROCK:5, SAND:6, GRAVEL:7, WATER:8,
  LOG:9, LEAVES:10, PLANKS:11, GLASS:12, COAL_ORE:13, IRON_ORE:14, GOLD_ORE:15,
  DIAMOND_ORE:16, REDSTONE_ORE:17, SNOWGRASS:18, CACTUS:19, FLOWER_R:20, FLOWER_Y:21,
  TALLGRASS:22, CRAFT:23, FURNACE:24, FURNACE_LIT:25, TORCH:26, TNT:27, WOOL:28,
  BRICKS:29, STONEBRICK:30, OBSIDIAN:31, PUMPKIN:32, BED:33,
  CHEST:34, FARMLAND:35, CROP:36, CROP_RIPE:37,
  BIRCH_LOG:38, BIRCH_LEAVES:39, ACACIA_LOG:40, ENCHANT:41,
  LEVER_OFF:42, LEVER_ON:43, LAMP_OFF:44, LAMP_ON:45, IRON_DOOR:46, IRON_DOOR_OPEN:47,
  LAVA:48, NETHERRACK:49, SOULSAND:50, GLOWSTONE:51, NETHERBRICK:52, PORTAL:53, QUARTZ_ORE:54,
  ENDSTONE:55, END_FRAME:56, END_FRAME_LIT:57, END_PORTAL:58, DRAGON_EGG:59, END_CRYSTAL:60,
  HEAL_MACHINE:61, FOSSIL_MACHINE:62, PC_BLOCK:63, FOSSIL_ORE:64, MYSTIC_ORE:65,
  DOOR:66, DOOR_OPEN:67,
  // ===== ID 할당표 (블록 68-99, isBlockId<100) =====
  // 🌲 지형 바이옴 블록 68-79
  SPRUCE_LOG:68, SPRUCE_LEAVES:69, JUNGLE_LOG:70, JUNGLE_LEAVES:71, CHERRY_LOG:72, CHERRY_LEAVES:73,
  MYCELIUM:74, RED_SAND:75, TERRACOTTA:76, DEEPSLATE:77, PODZOL:78, MUSHROOM:79,
  // 🧱 MC 장식·작물 80-91 (다음 배치 예약)
  // 92-99 버퍼
};
// 렌더 타입
const RT = { SOLID:0, CROSS:1, WATER:2, GLASS:3 };

// ----- 아이템 ID (>=100) -----
const I = {
  STICK:100, COAL:101, IRON_INGOT:102, GOLD_INGOT:103, DIAMOND:104, REDSTONE:105,
  APPLE:106, PORK_RAW:107, PORK_COOKED:108, BEEF_RAW:109, BEEF_COOKED:110,
  ROTTEN:111, BONE:112, GUNPOWDER:113, FEATHER:114,
  WOOD_PICK:120, WOOD_AXE:121, WOOD_SHOVEL:122, WOOD_SWORD:123,
  STONE_PICK:124, STONE_AXE:125, STONE_SHOVEL:126, STONE_SWORD:127,
  IRON_PICK:128, IRON_AXE:129, IRON_SHOVEL:130, IRON_SWORD:131,
  DIA_PICK:132, DIA_AXE:133, DIA_SHOVEL:134, DIA_SWORD:135,
  WOOD_HOE:136, STONE_HOE:137, IRON_HOE:138, DIA_HOE:139,
  POKEBALL:150, GREATBALL:151, ULTRABALL:152, POTION:153, SUPERPOTION:154, HYPERPOTION:155, MASTERBALL:156, GOD_ORB:212,
  SEEDS:160, WHEAT:161, BREAD:162, BONEMEAL:163, STRING:164,
  FISHING_ROD:165, BOW:166, ARROW:167, FLINT:168,
  FISH_RAW:169, FISH_COOKED:170, RARECANDY:171, GOLDEN_APPLE:172,
  EMERALD:174, ENDERPEARL:175,
  BADGE_ROCK:176, BADGE_WATER:177, BADGE_ELEC:178, BADGE_FIRE:179,
  LEATHER:180,
  L_HELM:181, L_CHEST:182, L_LEGS:183,
  I_HELM:184, I_CHEST:185, I_LEGS:186,
  D_HELM:187, D_CHEST:188, D_LEGS:189,
  POTION_SPEED:190, POTION_JUMP:191, POTION_REGEN:192,
  FLINT_STEEL:193, QUARTZ:194, GLOWDUST:195, BLAZE_ROD:196, ENDER_EYE:197,
  FIRE_STONE:198, WATER_STONE:199, THUNDER_STONE:200, LEAF_STONE:201, MOON_STONE:202,
  FOSSIL_HELIX:203, FOSSIL_DOME:204, FOSSIL_AMBER:205, POKE_BAG:211,
  BUCKET:206, WATER_BUCKET:207, LAVA_BUCKET:208, LINK_CABLE:209, MEGA_STONE:210
};

// ----- 타일 인덱스 (아틀라스 16x16 그리드) -----
const T = {
  GRASS_TOP:0, GRASS_SIDE:1, DIRT:2, STONE:3, COBBLE:4, BEDROCK:5, SAND:6, GRAVEL:7,
  WATER:8, LOG_SIDE:9, LOG_TOP:10, LEAVES:11, PLANKS:12, GLASS:13, ORE_COAL:14, ORE_IRON:15,
  ORE_GOLD:16, ORE_DIAMOND:17, ORE_REDSTONE:18, SNOW_TOP:19, SNOW_SIDE:20, CACTUS:21,
  FLOWER_R:22, FLOWER_Y:23, TALLGRASS:24, CRAFT_TOP:25, CRAFT_SIDE:26, FURN_FRONT:27,
  FURN_SIDE:28, FURN_LIT:29, TORCH:30, TNT_SIDE:31,
  TNT_TOP:32, WOOL:33, BRICKS:34, STONEBRICK:35, OBSIDIAN:36, PUMPKIN_SIDE:37,
  PUMPKIN_FACE:38, PUMPKIN_TOP:39, BED_TOP:40,
  CHEST_FRONT:41, CHEST_SIDE:42, CHEST_TOP:43, FARMLAND_TOP:44, CROP1:45, CROP2:46,
  BIRCH_SIDE:47, BIRCH_LEAVES:48, ACACIA_SIDE:49, ENCH_TOP:50, ENCH_SIDE:51,
  LEVER:52, LEVER_ON_T:53, LAMP:54, LAMP_ON_T:55, IRON_DOOR_T:56,
  LAVA_T:57, NETHERRACK_T:58, SOULSAND_T:59, GLOWSTONE_T:60, NETHERBRICK_T:61, PORTAL_T:62, QUARTZ_T:63,
  ENDSTONE_T:64, ENDFRAME_T:65, ENDFRAME_LIT_T:66, ENDPORTAL_T:67, DRAGONEGG_T:68, CRYSTAL_T:69,
  HEALM_T:70, HEALM_TOP_T:71, FOSSILM_T:72, PC_T:73, FOSSILORE_T:74, MYSTICORE_T:75, DOOR_T:76,
  // 🌲 지형 바이옴 타일 77+
  SPRUCE_SIDE:77, SPRUCE_TOP:78, SPRUCE_LEAVES_T:79, JUNGLE_SIDE:80, JUNGLE_LEAVES_T:81,
  CHERRY_SIDE:82, CHERRY_TOP:83, CHERRY_LEAVES_T:84, MYCELIUM_TOP:85, MYCELIUM_SIDE:86,
  RED_SAND_T:87, TERRACOTTA_T:88, DEEPSLATE_T:89, PODZOL_TOP:90, PODZOL_SIDE:91, MUSHROOM_T:92
};

// ----- 블록 정의 -----
// hard: 기본 채굴 시간(초), -1 = 못 부숨 / tool: 알맞은 도구 / tier: 드롭에 필요한 곡괭이 등급
// drop: (rng)=>[[id,n],...]  (생략 시 자기 자신)
const BLOCKS = [];
function defBlock(id, def){
  BLOCKS[id] = Object.assign({
    name:'블록', rt:RT.SOLID, solid:true, hard:1, tool:null, tier:0, light:0,
    tiles:{ top:T.STONE, bottom:T.STONE, side:T.STONE }, drop:null
  }, def);
}
defBlock(B.AIR,        { name:'공기', solid:false, rt:-1, hard:-1 });
defBlock(B.GRASS,      { name:'잔디 블록', tiles:{top:T.GRASS_TOP, bottom:T.DIRT, side:T.GRASS_SIDE}, hard:0.7, tool:'shovel', drop:()=>[[B.DIRT,1]] });
defBlock(B.DIRT,       { name:'흙', tiles:{top:T.DIRT, bottom:T.DIRT, side:T.DIRT}, hard:0.6, tool:'shovel' });
defBlock(B.STONE,      { name:'돌', tiles:{top:T.STONE, bottom:T.STONE, side:T.STONE}, hard:1.8, tool:'pick', drop:()=>[[B.COBBLE,1]] });
defBlock(B.COBBLE,     { name:'조약돌', tiles:{top:T.COBBLE, bottom:T.COBBLE, side:T.COBBLE}, hard:2.2, tool:'pick' });
defBlock(B.BEDROCK,    { name:'기반암', tiles:{top:T.BEDROCK, bottom:T.BEDROCK, side:T.BEDROCK}, hard:-1 });
defBlock(B.SAND,       { name:'모래', tiles:{top:T.SAND, bottom:T.SAND, side:T.SAND}, hard:0.6, tool:'shovel' });
defBlock(B.GRAVEL,     { name:'자갈', tiles:{top:T.GRAVEL, bottom:T.GRAVEL, side:T.GRAVEL}, hard:0.7, tool:'shovel',
                         drop:(rng)=> rng() < 0.25 ? [[I.FLINT,1]] : [[B.GRAVEL,1]] });
defBlock(B.WATER,      { name:'물', rt:RT.WATER, solid:false, hard:-1, tiles:{top:T.WATER, bottom:T.WATER, side:T.WATER} });
defBlock(B.LOG,        { name:'원목', tiles:{top:T.LOG_TOP, bottom:T.LOG_TOP, side:T.LOG_SIDE}, hard:2.2, tool:'axe' });
defBlock(B.LEAVES,     { name:'나뭇잎', tiles:{top:T.LEAVES, bottom:T.LEAVES, side:T.LEAVES}, hard:0.3,
                         drop:(rng)=> rng() < 0.08 ? [[I.APPLE,1]] : [] });
defBlock(B.PLANKS,     { name:'나무 판자', tiles:{top:T.PLANKS, bottom:T.PLANKS, side:T.PLANKS}, hard:1.8, tool:'axe' });
defBlock(B.GLASS,      { name:'유리', rt:RT.GLASS, tiles:{top:T.GLASS, bottom:T.GLASS, side:T.GLASS}, hard:0.4, drop:()=>[] });
defBlock(B.COAL_ORE,   { name:'석탄 광석', tiles:{top:T.ORE_COAL, bottom:T.ORE_COAL, side:T.ORE_COAL}, hard:2.6, tool:'pick', tier:0, drop:()=>[[I.COAL,1]] });
defBlock(B.IRON_ORE,   { name:'철 광석', tiles:{top:T.ORE_IRON, bottom:T.ORE_IRON, side:T.ORE_IRON}, hard:2.8, tool:'pick', tier:1 });
defBlock(B.GOLD_ORE,   { name:'금 광석', tiles:{top:T.ORE_GOLD, bottom:T.ORE_GOLD, side:T.ORE_GOLD}, hard:2.8, tool:'pick', tier:2 });
defBlock(B.DIAMOND_ORE,{ name:'다이아몬드 광석', tiles:{top:T.ORE_DIAMOND, bottom:T.ORE_DIAMOND, side:T.ORE_DIAMOND}, hard:3, tool:'pick', tier:2, drop:()=>[[I.DIAMOND,1]] });
defBlock(B.REDSTONE_ORE,{name:'레드스톤 광석', tiles:{top:T.ORE_REDSTONE, bottom:T.ORE_REDSTONE, side:T.ORE_REDSTONE}, hard:3, tool:'pick', tier:2, drop:(rng)=>[[I.REDSTONE, 3+Math.floor(rng()*3)]] });
defBlock(B.SNOWGRASS,  { name:'눈 덮인 잔디', tiles:{top:T.SNOW_TOP, bottom:T.DIRT, side:T.SNOW_SIDE}, hard:0.7, tool:'shovel', drop:()=>[[B.DIRT,1]] });
defBlock(B.CACTUS,     { name:'선인장', tiles:{top:T.CACTUS, bottom:T.CACTUS, side:T.CACTUS}, hard:0.5 });
defBlock(B.FLOWER_R,   { name:'빨간 꽃', rt:RT.CROSS, solid:false, tiles:{top:T.FLOWER_R, bottom:T.FLOWER_R, side:T.FLOWER_R}, hard:0.05 });
defBlock(B.FLOWER_Y,   { name:'노란 꽃', rt:RT.CROSS, solid:false, tiles:{top:T.FLOWER_Y, bottom:T.FLOWER_Y, side:T.FLOWER_Y}, hard:0.05 });
defBlock(B.TALLGRASS,  { name:'풀', rt:RT.CROSS, solid:false, tiles:{top:T.TALLGRASS, bottom:T.TALLGRASS, side:T.TALLGRASS}, hard:0.05,
                         drop:(rng)=> rng() < 0.15 ? [[I.SEEDS,1]] : [] });
defBlock(B.CRAFT,      { name:'제작대', tiles:{top:T.CRAFT_TOP, bottom:T.PLANKS, side:T.CRAFT_SIDE}, hard:2.2, tool:'axe' });
defBlock(B.FURNACE,    { name:'화로', tiles:{top:T.STONE, bottom:T.STONE, side:T.FURN_FRONT}, hard:3, tool:'pick' });
defBlock(B.FURNACE_LIT,{ name:'화로(가동중)', tiles:{top:T.STONE, bottom:T.STONE, side:T.FURN_LIT}, hard:3, tool:'pick', light:0.7, drop:()=>[[B.FURNACE,1]] });
defBlock(B.TORCH,      { name:'횃불', rt:RT.CROSS, solid:false, tiles:{top:T.TORCH, bottom:T.TORCH, side:T.TORCH}, hard:0.05, light:1.35, drop:()=>[[B.TORCH,1]] });
defBlock(B.TNT,        { name:'TNT', tiles:{top:T.TNT_TOP, bottom:T.TNT_TOP, side:T.TNT_SIDE}, hard:0.2 });
defBlock(B.WOOL,       { name:'양털', tiles:{top:T.WOOL, bottom:T.WOOL, side:T.WOOL}, hard:0.8 });
defBlock(B.BRICKS,     { name:'벽돌', tiles:{top:T.BRICKS, bottom:T.BRICKS, side:T.BRICKS}, hard:2.5, tool:'pick' });
defBlock(B.STONEBRICK, { name:'석재 벽돌', tiles:{top:T.STONEBRICK, bottom:T.STONEBRICK, side:T.STONEBRICK}, hard:2.2, tool:'pick' });
defBlock(B.OBSIDIAN,   { name:'흑요석', tiles:{top:T.OBSIDIAN, bottom:T.OBSIDIAN, side:T.OBSIDIAN}, hard:12, tool:'pick', tier:3 });
defBlock(B.PUMPKIN,    { name:'호박', tiles:{top:T.PUMPKIN_TOP, bottom:T.PUMPKIN_TOP, side:T.PUMPKIN_FACE}, hard:0.8, tool:'axe' });
defBlock(B.BED,        { name:'침대', tiles:{top:T.BED_TOP, bottom:T.PLANKS, side:T.PLANKS}, hard:0.3 });
defBlock(B.CHEST,      { name:'상자', tiles:{top:T.CHEST_TOP, bottom:T.CHEST_TOP, side:T.CHEST_FRONT}, hard:2.2, tool:'axe' });
defBlock(B.FARMLAND,   { name:'경작지', tiles:{top:T.FARMLAND_TOP, bottom:T.DIRT, side:T.DIRT}, hard:0.6, tool:'shovel', drop:()=>[[B.DIRT,1]] });
defBlock(B.CROP,       { name:'밀 (자라는 중)', rt:RT.CROSS, solid:false, tiles:{top:T.CROP1, bottom:T.CROP1, side:T.CROP1}, hard:0.05, drop:()=>[[I.SEEDS,1]] });
defBlock(B.BIRCH_LOG,   { name:'자작나무 원목', tiles:{top:T.LOG_TOP, bottom:T.LOG_TOP, side:T.BIRCH_SIDE}, hard:2.2, tool:'axe' });
defBlock(B.BIRCH_LEAVES,{ name:'자작나무 잎', tiles:{top:T.BIRCH_LEAVES, bottom:T.BIRCH_LEAVES, side:T.BIRCH_LEAVES}, hard:0.3,
                         drop:(rng)=> rng() < 0.08 ? [[I.APPLE,1]] : [] });
defBlock(B.ACACIA_LOG,  { name:'아카시아 원목', tiles:{top:T.LOG_TOP, bottom:T.LOG_TOP, side:T.ACACIA_SIDE}, hard:2.2, tool:'axe' });
defBlock(B.ENCHANT,     { name:'인챈트 테이블', tiles:{top:T.ENCH_TOP, bottom:T.OBSIDIAN, side:T.ENCH_SIDE}, hard:6, tool:'pick', tier:1 });
defBlock(B.LEVER_OFF,   { name:'레버', rt:RT.CROSS, solid:false, tiles:{top:T.LEVER, bottom:T.LEVER, side:T.LEVER}, hard:0.3, drop:()=>[[B.LEVER_OFF,1]] });
defBlock(B.LEVER_ON,    { name:'레버(켜짐)', rt:RT.CROSS, solid:false, tiles:{top:T.LEVER_ON_T, bottom:T.LEVER_ON_T, side:T.LEVER_ON_T}, hard:0.3, drop:()=>[[B.LEVER_OFF,1]] });
defBlock(B.LAMP_OFF,    { name:'레드스톤 램프', tiles:{top:T.LAMP, bottom:T.LAMP, side:T.LAMP}, hard:0.8 });
defBlock(B.LAMP_ON,     { name:'레드스톤 램프(켜짐)', tiles:{top:T.LAMP_ON_T, bottom:T.LAMP_ON_T, side:T.LAMP_ON_T}, hard:0.8, light:1, drop:()=>[[B.LAMP_OFF,1]] });
defBlock(B.IRON_DOOR,   { name:'철문', tiles:{top:T.IRON_DOOR_T, bottom:T.IRON_DOOR_T, side:T.IRON_DOOR_T}, hard:4, tool:'pick' });
defBlock(B.IRON_DOOR_OPEN,{ name:'철문(열림)', rt:RT.CROSS, solid:false, tiles:{top:T.IRON_DOOR_T, bottom:T.IRON_DOOR_T, side:T.IRON_DOOR_T}, hard:4, drop:()=>[[B.IRON_DOOR,1]] });
defBlock(B.LAVA,       { name:'용암', rt:RT.WATER, solid:false, hard:-1, tiles:{top:T.LAVA_T, bottom:T.LAVA_T, side:T.LAVA_T} });
defBlock(B.NETHERRACK, { name:'네더랙', tiles:{top:T.NETHERRACK_T, bottom:T.NETHERRACK_T, side:T.NETHERRACK_T}, hard:0.5, tool:'pick' });
defBlock(B.SOULSAND,   { name:'영혼 모래', tiles:{top:T.SOULSAND_T, bottom:T.SOULSAND_T, side:T.SOULSAND_T}, hard:0.6, tool:'shovel' });
defBlock(B.GLOWSTONE,  { name:'발광석', tiles:{top:T.GLOWSTONE_T, bottom:T.GLOWSTONE_T, side:T.GLOWSTONE_T}, hard:0.4, light:1,
                         drop:(rng)=>[[I.GLOWDUST, 2 + Math.floor(rng() * 3)]] });
defBlock(B.NETHERBRICK,{ name:'네더 벽돌', tiles:{top:T.NETHERBRICK_T, bottom:T.NETHERBRICK_T, side:T.NETHERBRICK_T}, hard:2.5, tool:'pick' });
defBlock(B.PORTAL,     { name:'네더 포탈', rt:RT.GLASS, solid:false, hard:-1, light:1, tiles:{top:T.PORTAL_T, bottom:T.PORTAL_T, side:T.PORTAL_T}, drop:()=>[] });
defBlock(B.QUARTZ_ORE, { name:'네더 석영 광석', tiles:{top:T.QUARTZ_T, bottom:T.QUARTZ_T, side:T.QUARTZ_T}, hard:2.5, tool:'pick',
                         drop:()=>[[I.QUARTZ,1]] });
defBlock(B.ENDSTONE,   { name:'엔드스톤', tiles:{top:T.ENDSTONE_T, bottom:T.ENDSTONE_T, side:T.ENDSTONE_T}, hard:2.2, tool:'pick' });
defBlock(B.END_FRAME,  { name:'엔드 포탈 프레임', tiles:{top:T.ENDFRAME_T, bottom:T.ENDSTONE_T, side:T.ENDFRAME_T}, hard:-1 });
defBlock(B.END_FRAME_LIT, { name:'엔드 포탈 프레임 (눈)', tiles:{top:T.ENDFRAME_LIT_T, bottom:T.ENDSTONE_T, side:T.ENDFRAME_T}, hard:-1, light:1 });
defBlock(B.END_PORTAL, { name:'엔드 포탈', rt:RT.GLASS, solid:false, hard:-1, light:1, tiles:{top:T.ENDPORTAL_T, bottom:T.ENDPORTAL_T, side:T.ENDPORTAL_T}, drop:()=>[] });
defBlock(B.DRAGON_EGG, { name:'드래곤 알', tiles:{top:T.DRAGONEGG_T, bottom:T.DRAGONEGG_T, side:T.DRAGONEGG_T}, hard:1.5, light:1 });
defBlock(B.END_CRYSTAL,{ name:'엔드 크리스탈', rt:RT.GLASS, tiles:{top:T.CRYSTAL_T, bottom:T.CRYSTAL_T, side:T.CRYSTAL_T}, hard:0.05, light:1, drop:()=>[] });
defBlock(B.HEAL_MACHINE,  { name:'회복 머신', tiles:{top:T.HEALM_TOP_T, bottom:T.HEALM_T, side:T.HEALM_T}, hard:2, tool:'pick', light:1 });
defBlock(B.FOSSIL_MACHINE,{ name:'부활 머신', tiles:{top:T.HEALM_TOP_T, bottom:T.FOSSILM_T, side:T.FOSSILM_T}, hard:2, tool:'pick' });
defBlock(B.PC_BLOCK,      { name:'포켓몬 PC', tiles:{top:T.PC_T, bottom:T.PC_T, side:T.PC_T}, hard:2, tool:'pick' });
defBlock(B.FOSSIL_ORE,    { name:'화석 광석', tiles:{top:T.FOSSILORE_T, bottom:T.FOSSILORE_T, side:T.FOSSILORE_T}, hard:3, tool:'pick', tier:1,
                            drop:(rng)=>[[ [I.FOSSIL_HELIX, I.FOSSIL_DOME, I.FOSSIL_AMBER][Math.floor(rng() * 3)], 1 ]] });
defBlock(B.DOOR,      { name:'나무 문', tiles:{top:T.DOOR_T, bottom:T.DOOR_T, side:T.DOOR_T}, hard:1.5, tool:'axe' });
defBlock(B.DOOR_OPEN, { name:'나무 문(열림)', rt:RT.CROSS, solid:false, tiles:{top:T.DOOR_T, bottom:T.DOOR_T, side:T.DOOR_T}, hard:1.5, drop:()=>[[B.DOOR,1]] });
defBlock(B.MYSTIC_ORE,    { name:'신비한 광석', tiles:{top:T.MYSTICORE_T, bottom:T.MYSTICORE_T, side:T.MYSTICORE_T}, hard:3, tool:'pick', tier:1,
                            drop:(rng)=>[[ [I.FIRE_STONE, I.WATER_STONE, I.THUNDER_STONE, I.LEAF_STONE, I.MOON_STONE][Math.floor(rng() * 5)], 1 ]] });
defBlock(B.CROP_RIPE,  { name:'밀 (다 자람)', rt:RT.CROSS, solid:false, tiles:{top:T.CROP2, bottom:T.CROP2, side:T.CROP2}, hard:0.05,
                         drop:(rng)=>[[I.WHEAT,1], [I.SEEDS, 1 + Math.floor(rng() * 2)]] });

// ===== 🌲 지형 바이옴 블록 (68-79) =====
defBlock(B.SPRUCE_LOG,    { name:'가문비나무 원목', tiles:{top:T.SPRUCE_TOP, bottom:T.SPRUCE_TOP, side:T.SPRUCE_SIDE}, hard:2.2, tool:'axe', drop:()=>[[B.SPRUCE_LOG,1]] });
defBlock(B.SPRUCE_LEAVES, { name:'가문비나무 잎', tiles:{top:T.SPRUCE_LEAVES_T, bottom:T.SPRUCE_LEAVES_T, side:T.SPRUCE_LEAVES_T}, hard:0.3, drop:(rng)=> rng()<0.06?[[I.STICK,1]]:[] });
defBlock(B.JUNGLE_LOG,    { name:'정글나무 원목', tiles:{top:T.SPRUCE_TOP, bottom:T.SPRUCE_TOP, side:T.JUNGLE_SIDE}, hard:2.2, tool:'axe', drop:()=>[[B.JUNGLE_LOG,1]] });
defBlock(B.JUNGLE_LEAVES, { name:'정글나무 잎', tiles:{top:T.JUNGLE_LEAVES_T, bottom:T.JUNGLE_LEAVES_T, side:T.JUNGLE_LEAVES_T}, hard:0.3, drop:(rng)=> rng()<0.08?[[I.APPLE,1]]:[] });
defBlock(B.CHERRY_LOG,    { name:'벚나무 원목', tiles:{top:T.CHERRY_TOP, bottom:T.CHERRY_TOP, side:T.CHERRY_SIDE}, hard:2.2, tool:'axe', drop:()=>[[B.CHERRY_LOG,1]] });
defBlock(B.CHERRY_LEAVES, { name:'벚나무 잎', tiles:{top:T.CHERRY_LEAVES_T, bottom:T.CHERRY_LEAVES_T, side:T.CHERRY_LEAVES_T}, hard:0.3, drop:()=>[] });
defBlock(B.MYCELIUM,      { name:'균사체', tiles:{top:T.MYCELIUM_TOP, bottom:T.DIRT, side:T.MYCELIUM_SIDE}, hard:0.7, tool:'shovel', drop:()=>[[B.DIRT,1]] });
defBlock(B.RED_SAND,      { name:'붉은 모래', tiles:{top:T.RED_SAND_T, bottom:T.RED_SAND_T, side:T.RED_SAND_T}, hard:0.6, tool:'shovel' });
defBlock(B.TERRACOTTA,    { name:'테라코타', tiles:{top:T.TERRACOTTA_T, bottom:T.TERRACOTTA_T, side:T.TERRACOTTA_T}, hard:1.5, tool:'pick', drop:()=>[[B.TERRACOTTA,1]] });
defBlock(B.DEEPSLATE,     { name:'심층암', tiles:{top:T.DEEPSLATE_T, bottom:T.DEEPSLATE_T, side:T.DEEPSLATE_T}, hard:3.2, tool:'pick', drop:()=>[[B.COBBLE,1]] });
defBlock(B.PODZOL,        { name:'팟졸', tiles:{top:T.PODZOL_TOP, bottom:T.DIRT, side:T.PODZOL_SIDE}, hard:0.7, tool:'shovel', drop:()=>[[B.DIRT,1]] });
defBlock(B.MUSHROOM,      { name:'버섯', rt:RT.CROSS, solid:false, tiles:{top:T.MUSHROOM_T, bottom:T.MUSHROOM_T, side:T.MUSHROOM_T}, hard:0.05, light:0.2, drop:()=>[[B.MUSHROOM,1]] });

// ----- 아이템 정의 -----
const ITEMS = {};
function defItem(id, def){ ITEMS[id] = Object.assign({ name:'아이템', stack:64 }, def); }
defItem(I.STICK,      { name:'막대기' });
defItem(I.COAL,       { name:'석탄' });
defItem(I.IRON_INGOT, { name:'철 주괴' });
defItem(I.GOLD_INGOT, { name:'금 주괴' });
defItem(I.DIAMOND,    { name:'다이아몬드' });
defItem(I.REDSTONE,   { name:'레드스톤 가루' });
defItem(I.APPLE,      { name:'사과', food:5 });
defItem(I.PORK_RAW,   { name:'생 돼지고기', food:2 });
defItem(I.PORK_COOKED,{ name:'구운 돼지고기', food:8 });
defItem(I.BEEF_RAW,   { name:'생 소고기', food:2 });
defItem(I.BEEF_COOKED,{ name:'스테이크', food:8 });
defItem(I.ROTTEN,     { name:'썩은 살점', food:2 });
defItem(I.BONE,       { name:'뼈다귀' });
defItem(I.GUNPOWDER,  { name:'화약' });
defItem(I.FEATHER,    { name:'깃털' });
const TIER_NAMES = ['나무', '돌', '철', '다이아몬드'];
const TOOL_SPEED = [2, 4, 6, 8];
const TOOL_DUR   = [60, 132, 251, 800];
[['PICK','곡괭이','pick'], ['AXE','도끼','axe'], ['SHOVEL','삽','shovel'], ['SWORD','검','sword'], ['HOE','호미','hoe']].forEach(([suf, kn, kind])=>{
  ['WOOD','STONE','IRON','DIA'].forEach((mat, tier)=>{
    const id = I[mat + '_' + suf];
    const dmg = kind === 'sword' ? 4 + tier : kind === 'axe' ? 3 + tier : 1 + tier;
    defItem(id, {
      name: TIER_NAMES[tier] + ' ' + kn, stack:1,
      tool: { kind, tier, speed:TOOL_SPEED[tier], dmg, dur:TOOL_DUR[tier] }
    });
  });
});
defItem(I.POKEBALL,  { name:'포켓볼', stack:16, ball:1.2 });
defItem(I.GREATBALL, { name:'슈퍼볼', stack:16, ball:1.8 });
defItem(I.ULTRABALL, { name:'하이퍼볼', stack:16, ball:2.5 });
defItem(I.MASTERBALL,{ name:'마스터볼', stack:4,  ball:6 }); // 100% 포획 — catchChance에서 특별 처리
defItem(I.GOD_ORB,   { name:'신의 오브', stack:4 }); // 신급 포켓몬 소환
defItem(I.POTION,    { name:'상처약', stack:16, pokeHeal:25 });
defItem(I.SUPERPOTION,{ name:'좋은상처약', stack:16, pokeHeal:50 });
defItem(I.HYPERPOTION,{ name:'고급상처약', stack:16, pokeHeal:120 });
defItem(I.SEEDS,     { name:'밀 씨앗' });
defItem(I.WHEAT,     { name:'밀' });
defItem(I.BREAD,     { name:'빵', food:6 });
defItem(I.BONEMEAL,  { name:'골분' });
defItem(I.STRING,    { name:'실' });
defItem(I.FISHING_ROD, { name:'낚싯대', stack:1, tool:{ kind:'rod', tier:0, speed:1, dmg:1, dur:64 } });
defItem(I.BOW,       { name:'활', stack:1, tool:{ kind:'bow', tier:0, speed:1, dmg:1, dur:128 } });
defItem(I.ARROW,     { name:'화살' });
defItem(I.FLINT,     { name:'부싯돌' });
defItem(I.FISH_RAW,  { name:'생선', food:2 });
defItem(I.FISH_COOKED,{ name:'구운 생선', food:7 });
defItem(I.RARECANDY, { name:'이상한 사탕', stack:16 });
defItem(I.GOLDEN_APPLE, { name:'황금 사과', food:20, stack:16 });
defItem(I.EMERALD,    { name:'에메랄드' });
defItem(I.ENDERPEARL, { name:'엔더 진주', stack:16 });
defItem(I.BADGE_ROCK, { name:'바위 배지', stack:1, badge:'rock' });
defItem(I.BADGE_WATER,{ name:'물결 배지', stack:1, badge:'water' });
defItem(I.BADGE_ELEC, { name:'전기 배지', stack:1, badge:'electric' });
defItem(I.BADGE_FIRE, { name:'불꽃 배지', stack:1, badge:'fire' });
defItem(I.LEATHER, { name:'가죽' });
[['L','가죽',[1,2,1],80,'#9a6b35'], ['I','철',[2,3,2],180,'#d8d8d8'], ['D','다이아몬드',[3,4,3],400,'#4ee1d2']].forEach(([pre, kn, pts, dur])=>{
  defItem(I[pre+'_HELM'],  { name:kn+' 투구', stack:1, armor:{slot:0, pts:pts[0], dur} });
  defItem(I[pre+'_CHEST'], { name:kn+' 갑옷', stack:1, armor:{slot:1, pts:pts[1], dur} });
  defItem(I[pre+'_LEGS'],  { name:kn+' 바지', stack:1, armor:{slot:2, pts:pts[2], dur} });
});
defItem(I.POTION_SPEED, { name:'신속의 물약', stack:16, buff:'speed' });
defItem(I.POTION_JUMP,  { name:'도약의 물약', stack:16, buff:'jump' });
defItem(I.POTION_REGEN, { name:'재생의 물약', stack:16, buff:'regen' });
defItem(I.FLINT_STEEL, { name:'부싯돌과 부시', stack:1, tool:{ kind:'igniter', tier:0, speed:1, dmg:1, dur:64 } });
defItem(I.QUARTZ,    { name:'네더 석영' });
defItem(I.GLOWDUST,  { name:'발광석 가루' });
defItem(I.BLAZE_ROD, { name:'블레이즈 막대' });
defItem(I.ENDER_EYE, { name:'엔더의 눈', stack:16 });
defItem(I.FIRE_STONE,    { name:'불꽃의 돌', stack:16 });
defItem(I.WATER_STONE,   { name:'물의 돌', stack:16 });
defItem(I.THUNDER_STONE, { name:'천둥의 돌', stack:16 });
defItem(I.LEAF_STONE,    { name:'리프의 돌', stack:16 });
defItem(I.MOON_STONE,    { name:'달의 돌', stack:16 });
defItem(I.FOSSIL_HELIX,  { name:'조개 화석', stack:16 });
defItem(I.FOSSIL_DOME,   { name:'돔 화석', stack:16 });
defItem(I.FOSSIL_AMBER,  { name:'오래된 호박', stack:16 });
defItem(I.BUCKET,       { name:'양동이', stack:1 });
defItem(I.WATER_BUCKET, { name:'물 양동이', stack:1 });
defItem(I.LAVA_BUCKET,  { name:'용암 양동이', stack:1 });
defItem(I.LINK_CABLE,   { name:'연결의 끈', stack:4 });
defItem(I.MEGA_STONE,   { name:'메가스톤', stack:1 });
defItem(I.POKE_BAG,  { name:'포켓몬 가방', stack:1 });

function isBlockId(id){ return id > 0 && id < 100; }
function itemDef(id){ return isBlockId(id) ? BLOCKS[id] : ITEMS[id]; }
function itemName(id){ const d = itemDef(id); return d ? d.name : '?'; }
function maxStack(id){ return isBlockId(id) ? 64 : (ITEMS[id] ? ITEMS[id].stack : 64); }
function foodValue(id){ return (!isBlockId(id) && ITEMS[id] && ITEMS[id].food) || 0; }
function toolInfo(id){ return (!isBlockId(id) && ITEMS[id] && ITEMS[id].tool) || null; }
function armorInfo(id){ return (!isBlockId(id) && ITEMS[id] && ITEMS[id].armor) || null; }
function buffOf(id){ return (!isBlockId(id) && ITEMS[id] && ITEMS[id].buff) || null; }
function ballBonus(id){ return (!isBlockId(id) && ITEMS[id] && ITEMS[id].ball) || 0; }

// 크리에이티브 목록
const CREATIVE_ITEMS = [
  B.GRASS,B.DIRT,B.STONE,B.COBBLE,B.SAND,B.GRAVEL,B.LOG,B.LEAVES,B.PLANKS,B.GLASS,
  B.COAL_ORE,B.IRON_ORE,B.GOLD_ORE,B.DIAMOND_ORE,B.REDSTONE_ORE,B.SNOWGRASS,B.CACTUS,
  B.FLOWER_R,B.FLOWER_Y,B.TALLGRASS,B.CRAFT,B.FURNACE,B.TORCH,B.TNT,B.WOOL,B.BRICKS,
  B.STONEBRICK,B.OBSIDIAN,B.PUMPKIN,B.BED,B.CHEST,B.FARMLAND,B.BIRCH_LOG,B.BIRCH_LEAVES,B.ACACIA_LOG,B.ENCHANT,B.LEVER_OFF,B.LAMP_OFF,B.IRON_DOOR,B.LAVA,B.NETHERRACK,B.SOULSAND,B.GLOWSTONE,B.NETHERBRICK,B.QUARTZ_ORE,
  I.STICK,I.COAL,I.IRON_INGOT,I.GOLD_INGOT,I.DIAMOND,I.REDSTONE,I.APPLE,I.PORK_COOKED,I.BEEF_COOKED,
  I.SEEDS,I.WHEAT,I.BREAD,I.BONEMEAL,I.STRING,I.FISHING_ROD,I.BOW,I.ARROW,I.FLINT,I.FISH_COOKED,
  I.WOOD_PICK,I.WOOD_AXE,I.WOOD_SHOVEL,I.WOOD_SWORD,I.WOOD_HOE,
  I.STONE_PICK,I.STONE_AXE,I.STONE_SHOVEL,I.STONE_SWORD,I.STONE_HOE,
  I.IRON_PICK,I.IRON_AXE,I.IRON_SHOVEL,I.IRON_SWORD,I.IRON_HOE,
  I.DIA_PICK,I.DIA_AXE,I.DIA_SHOVEL,I.DIA_SWORD,I.DIA_HOE,
  I.POKEBALL,I.GREATBALL,I.ULTRABALL,I.MASTERBALL,I.GOD_ORB,I.POTION,I.SUPERPOTION,I.HYPERPOTION,I.RARECANDY,I.GOLDEN_APPLE,I.EMERALD,I.ENDERPEARL,
  I.LEATHER,I.L_HELM,I.L_CHEST,I.L_LEGS,I.I_HELM,I.I_CHEST,I.I_LEGS,I.D_HELM,I.D_CHEST,I.D_LEGS,
  I.POTION_SPEED,I.POTION_JUMP,I.POTION_REGEN,I.FLINT_STEEL,I.QUARTZ,I.GLOWDUST,I.BLAZE_ROD,I.ENDER_EYE,B.END_CRYSTAL,
  B.SPRUCE_LOG,B.SPRUCE_LEAVES,B.JUNGLE_LOG,B.JUNGLE_LEAVES,B.CHERRY_LOG,B.CHERRY_LEAVES,B.MYCELIUM,B.RED_SAND,B.TERRACOTTA,B.DEEPSLATE,B.PODZOL,B.MUSHROOM
];

// ===== 텍스처 아틀라스 =====
const ATLAS = { canvas:null, texture:null, TILE:16, COLS:16 };

function buildAtlas(){
  const TILE = 16, COLS = 16, SIZE = 256;
  const cv = document.createElement('canvas'); cv.width = SIZE; cv.height = SIZE;
  const ctx = cv.getContext('2d');

  function paint(tile, fn){
    const ox = (tile % COLS) * TILE, oy = Math.floor(tile / COLS) * TILE;
    const rng = mulberry32(tile * 7919 + 3);
    fn({
      fill(c){ ctx.fillStyle = c; ctx.fillRect(ox, oy, TILE, TILE); },
      px(x, y, c){ ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, 1, 1); },
      rect(x, y, w, h, c){ ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); },
      speck(c, n){ for(let i = 0; i < n; i++){ ctx.fillStyle = c; ctx.fillRect(ox + (rng()*16|0), oy + (rng()*16|0), 1, 1); } },
      blob(c, n, s){ for(let i = 0; i < n; i++){ ctx.fillStyle = c; ctx.fillRect(ox + (rng()*14|0), oy + (rng()*14|0), s, s); } },
      rng
    });
  }
  function stoneBase(p){ p.fill('#7f7f7f'); p.speck('#6e6e6e', 50); p.speck('#909090', 50); p.speck('#777', 30); }

  paint(T.GRASS_TOP, p=>{ p.fill('#91bd59'); p.speck('#7fa84d', 70); p.speck('#a3cc69', 55); p.speck('#86b34f', 35); });
  paint(T.GRASS_SIDE, p=>{ p.fill('#866043'); p.speck('#79553a', 50); p.speck('#96714d', 40);
    p.rect(0,0,16,3,'#91bd59'); for(let x=0;x<16;x++){ if(p.rng()<0.6) p.px(x,3,'#7fa84d'); if(p.rng()<0.3) p.px(x,4,'#7fa84d'); } });
  paint(T.DIRT, p=>{ p.fill('#866043'); p.speck('#79553a', 60); p.speck('#96714d', 50); p.speck('#6b4a33', 25); });
  paint(T.STONE, stoneBase);
  paint(T.COBBLE, p=>{ p.fill('#7a7a7a'); p.blob('#696969', 10, 4); p.blob('#8f8f8f', 8, 3); p.speck('#4f4f4f', 40); });
  paint(T.BEDROCK, p=>{ p.fill('#565656'); p.blob('#222222', 12, 4); p.blob('#787878', 8, 3); });
  paint(T.SAND, p=>{ p.fill('#dbd3a0'); p.speck('#cfc78f', 60); p.speck('#e6dfae', 50); });
  paint(T.GRAVEL, p=>{ p.fill('#807c7b'); p.blob('#6e6a69', 12, 3); p.blob('#939090', 10, 2); p.speck('#5a5654', 30); });
  paint(T.WATER, p=>{ p.fill('#3f76e4'); p.speck('#3666c8', 50); p.speck('#5a8af0', 45); p.speck('#6f9bf5', 18); });
  paint(T.LOG_SIDE, p=>{ p.fill('#6e5530'); for(let x=0;x<16;x+=3){ p.rect(x,0,1,16,'#57441f'); } p.speck('#7d6238', 35); });
  paint(T.LOG_TOP, p=>{ p.fill('#6e5530'); p.rect(2,2,12,12,'#b8945f'); p.rect(4,4,8,8,'#9a7b4d'); p.rect(6,6,4,4,'#b8945f'); });
  paint(T.LEAVES, p=>{ p.fill('#4a8f28'); p.speck('#3a7a1c', 80); p.speck('#5fa83a', 70); p.speck('#2f6314', 35); });
  paint(T.PLANKS, p=>{ p.fill('#b8945f'); for(let y=3;y<16;y+=4){ p.rect(0,y,16,1,'#785a35'); } p.speck('#ab8753', 35); });
  paint(T.GLASS, p=>{ p.rect(0,0,16,1,'#dff3f5'); p.rect(0,15,16,1,'#dff3f5'); p.rect(0,0,1,16,'#dff3f5'); p.rect(15,0,1,16,'#dff3f5');
    p.px(3,2,'#ffffff'); p.px(4,3,'#ffffff'); p.px(2,3,'#cfeef2'); p.px(12,11,'#cfeef2'); });
  function oreTile(t, c1, c2){ paint(t, p=>{ stoneBase(p); for(let i=0;i<6;i++){ const x=1+(p.rng()*13|0), y=1+(p.rng()*13|0); p.rect(x,y,2,2,c1); p.px(x,y,c2); } }); }
  oreTile(T.ORE_COAL, '#2c2c2c', '#444');
  oreTile(T.ORE_IRON, '#d8af93', '#e8c8ae');
  oreTile(T.ORE_GOLD, '#fce14c', '#fff08c');
  oreTile(T.ORE_DIAMOND, '#4ee1d2', '#9ef2e8');
  oreTile(T.ORE_REDSTONE, '#d32222', '#ff5b5b');
  paint(T.SNOW_TOP, p=>{ p.fill('#f9fefe'); p.speck('#e8f2f2', 45); p.speck('#ffffff', 45); });
  paint(T.SNOW_SIDE, p=>{ p.fill('#866043'); p.speck('#79553a', 45); p.rect(0,0,16,4,'#f9fefe'); p.speck('#e8f2f2', 8); });
  paint(T.CACTUS, p=>{ p.fill('#5b8f3a'); p.rect(0,0,1,16,'#487a2c'); p.rect(15,0,1,16,'#487a2c'); for(let i=0;i<8;i++) p.px(2+(p.rng()*12|0), p.rng()*16|0, '#76b052'); p.speck('#487a2c', 20); });
  paint(T.FLOWER_R, p=>{ p.rect(7,7,2,8,'#3c8a28'); p.rect(5,3,5,4,'#e23b3b'); p.rect(6,2,3,6,'#e23b3b'); p.rect(7,4,1,2,'#ffd83d'); });
  paint(T.FLOWER_Y, p=>{ p.rect(7,7,2,8,'#3c8a28'); p.rect(5,3,5,4,'#f5d327'); p.rect(6,2,3,6,'#f5d327'); p.px(7,4,'#a87617'); });
  paint(T.TALLGRASS, p=>{ for(let i=0;i<7;i++){ const x=2+i*2; const h=5+(p.rng()*8|0); p.rect(x, 16-h, 1, h, p.rng()<0.5?'#4d9422':'#5fae2e'); } });
  paint(T.CRAFT_TOP, p=>{ p.fill('#a07a48'); p.rect(0,0,16,1,'#6b4a2a'); p.rect(0,15,16,1,'#6b4a2a'); p.rect(0,0,1,16,'#6b4a2a'); p.rect(15,0,1,16,'#6b4a2a');
    p.rect(2,2,5,5,'#8c6a3c'); p.rect(9,2,5,5,'#8c6a3c'); p.rect(2,9,5,5,'#8c6a3c'); p.rect(9,9,5,5,'#8c6a3c'); });
  paint(T.CRAFT_SIDE, p=>{ p.fill('#a07a48'); p.rect(0,0,16,2,'#6b4a2a'); p.rect(2,4,4,5,'#7d5e34'); p.rect(9,4,5,4,'#7d5e34'); p.speck('#8c6a3c',25); });
  paint(T.FURN_FRONT, p=>{ stoneBase(p); p.rect(3,8,10,6,'#3a3a3a'); p.rect(4,9,8,4,'#222'); p.rect(2,2,12,3,'#6a6a6a'); });
  paint(T.FURN_SIDE, stoneBase);
  paint(T.FURN_LIT, p=>{ stoneBase(p); p.rect(3,8,10,6,'#3a3a3a'); p.rect(4,9,8,4,'#ff8c1a'); p.px(6,10,'#ffd83d'); p.px(9,11,'#ffd83d'); p.rect(2,2,12,3,'#6a6a6a'); });
  paint(T.TORCH, p=>{ p.rect(7,6,2,9,'#8a6a3a'); p.rect(7,4,2,2,'#ffd83d'); p.rect(7,3,2,1,'#fff1a8'); p.px(7,5,'#ff8c1a'); p.px(8,5,'#ff8c1a'); });
  paint(T.TNT_SIDE, p=>{ p.fill('#db441a'); p.rect(0,0,16,3,'#d8d8d8'); p.rect(0,13,16,3,'#d8d8d8'); p.rect(0,6,16,4,'#f0f0f0');
    ctx.fillStyle='#222'; ctx.font='bold 5px monospace'; ctx.fillText('TNT', (T.TNT_SIDE%16)*16+3, Math.floor(T.TNT_SIDE/16)*16+10); });
  paint(T.TNT_TOP, p=>{ p.fill('#db441a'); p.rect(5,5,6,6,'#d8d8d8'); p.rect(7,7,2,2,'#222'); });
  paint(T.WOOL, p=>{ p.fill('#e9ecec'); p.speck('#dde0e0', 60); p.speck('#f8fafa', 50); p.speck('#cdd0d0', 20); });
  paint(T.BRICKS, p=>{ p.fill('#8e4a36'); for(let y=0;y<16;y+=4){ p.rect(0,y,16,1,'#b0a6a0'); const off=(y/4%2)*4; for(let x=off;x<16;x+=8) p.rect(x,y,1,4,'#b0a6a0'); } });
  paint(T.STONEBRICK, p=>{ p.fill('#828282'); p.rect(0,0,16,1,'#5c5c5c'); p.rect(0,8,16,1,'#5c5c5c'); p.rect(7,0,1,8,'#5c5c5c'); p.rect(3,8,1,8,'#5c5c5c'); p.rect(11,8,1,8,'#5c5c5c'); p.speck('#959595',30); });
  paint(T.OBSIDIAN, p=>{ p.fill('#1c1426'); p.blob('#2c2040', 10, 3); p.speck('#4a3a6a', 20); p.speck('#0e0a14', 30); });
  paint(T.PUMPKIN_SIDE, p=>{ p.fill('#d8841a'); for(let x=2;x<16;x+=4) p.rect(x,0,1,16,'#b86c10'); p.speck('#e89c34',20); });
  paint(T.PUMPKIN_FACE, p=>{ p.fill('#d8841a'); for(let x=2;x<16;x+=4) p.rect(x,0,1,16,'#b86c10');
    p.rect(3,4,3,3,'#3a2408'); p.rect(10,4,3,3,'#3a2408'); p.rect(4,10,8,3,'#3a2408'); p.rect(6,9,4,1,'#3a2408'); });
  paint(T.PUMPKIN_TOP, p=>{ p.fill('#c87814'); p.rect(6,6,4,4,'#7a5a1a'); p.rect(7,7,2,2,'#5a4210'); });
  paint(T.BED_TOP, p=>{ p.fill('#b03030'); p.rect(0,0,16,5,'#e8e8e8'); p.rect(0,5,16,1,'#902020'); p.speck('#c84040', 18); });
  paint(T.CHEST_FRONT, p=>{ p.fill('#9a6b35'); p.rect(0,0,16,1,'#5a3d1c'); p.rect(0,15,16,1,'#5a3d1c'); p.rect(0,0,1,16,'#5a3d1c'); p.rect(15,0,1,16,'#5a3d1c');
    p.rect(0,6,16,1,'#5a3d1c'); p.rect(6,4,4,5,'#8a8a8a'); p.rect(7,5,2,3,'#4a4a4a'); p.speck('#8a5d2c', 25); });
  paint(T.CHEST_SIDE, p=>{ p.fill('#9a6b35'); p.rect(0,0,16,1,'#5a3d1c'); p.rect(0,15,16,1,'#5a3d1c'); p.rect(0,0,1,16,'#5a3d1c'); p.rect(15,0,1,16,'#5a3d1c');
    p.rect(0,6,16,1,'#5a3d1c'); p.speck('#8a5d2c', 25); });
  paint(T.CHEST_TOP, p=>{ p.fill('#9a6b35'); p.rect(0,0,16,1,'#5a3d1c'); p.rect(0,15,16,1,'#5a3d1c'); p.rect(0,0,1,16,'#5a3d1c'); p.rect(15,0,1,16,'#5a3d1c'); p.speck('#8a5d2c', 30); });
  paint(T.FARMLAND_TOP, p=>{ p.fill('#5d4228'); for(let x=1;x<16;x+=4) p.rect(x,0,2,16,'#4a3520'); p.speck('#6e5232', 30); p.speck('#3a2a18', 20); });
  paint(T.CROP1, p=>{ for(let i=0;i<6;i++){ const x=2+i*2+(p.rng()*1|0); const h=3+(p.rng()*4|0); p.rect(x,16-h,1,h,'#4fae3a'); } });
  paint(T.BIRCH_SIDE, p=>{ p.fill('#d8d0c0'); for(let i=0;i<7;i++){ p.rect(p.rng()*13|0, p.rng()*15|0, 3, 1, '#2a2a28'); } p.speck('#c8c0b0', 30); });
  paint(T.BIRCH_LEAVES, p=>{ p.fill('#6aa84a'); p.speck('#5a9838', 70); p.speck('#7ab85a', 60); p.speck('#4a8828', 30); });
  paint(T.ACACIA_SIDE, p=>{ p.fill('#6a5a50'); for(let x=0;x<16;x+=3){ p.rect(x,0,1,16,'#584a40'); } p.speck('#7a6a60', 30); });
  paint(T.ENCH_TOP, p=>{ p.fill('#2a1a3a'); p.rect(1,1,14,14,'#3a2a50'); p.rect(6,6,4,4,'#e84d60'); p.speck('#8a5fa8', 20); p.px(7,7,'#f5d327'); });
  paint(T.ENCH_SIDE, p=>{ p.fill('#3a3a3a'); p.rect(0,0,16,3,'#2a1a3a'); p.rect(2,5,12,8,'#5a3a28'); p.speck('#8a5fa8', 12); });
  paint(T.LEVER, p=>{ p.rect(7,8,2,7,'#8a6a3a'); p.rect(5,14,6,2,'#7a7a7a'); p.px(7,7,'#6a4a2a'); });
  paint(T.LEVER_ON_T, p=>{ p.rect(7,8,2,7,'#8a6a3a'); p.rect(5,14,6,2,'#7a7a7a'); p.rect(7,5,2,3,'#e83a3a'); });
  paint(T.LAMP, p=>{ p.fill('#5a4428'); p.rect(2,2,12,12,'#7a5a34'); p.rect(4,4,8,8,'#4a3420'); p.speck('#6a4a2c', 14); });
  paint(T.LAMP_ON_T, p=>{ p.fill('#7a5a34'); p.rect(2,2,12,12,'#f5c860'); p.rect(4,4,8,8,'#ffe89a'); p.speck('#f5d878', 10); });
  paint(T.IRON_DOOR_T, p=>{ p.fill('#b8b8b8'); for(let y=1;y<16;y+=4) p.rect(1,y,14,1,'#8a8a8a'); p.rect(1,1,1,14,'#8a8a8a'); p.rect(14,1,1,14,'#8a8a8a'); p.rect(11,8,2,2,'#5a5a5a'); });
  paint(T.LAVA_T, p=>{ p.fill('#d8540f'); p.speck('#f08020', 50); p.speck('#b8400a', 45); p.speck('#ffce3d', 16); });
  paint(T.NETHERRACK_T, p=>{ p.fill('#6e3533'); p.speck('#5a2a28', 60); p.speck('#824240', 50); p.speck('#4a2020', 25); });
  paint(T.SOULSAND_T, p=>{ p.fill('#574238'); p.speck('#473428', 55); p.speck('#675046', 40); p.rect(4,5,2,2,'#3a2a20'); p.rect(10,9,2,2,'#3a2a20'); p.rect(7,12,2,1,'#3a2a20'); });
  paint(T.GLOWSTONE_T, p=>{ p.fill('#c8a858'); p.blob('#f5d878', 10, 3); p.blob('#a88848', 8, 2); p.speck('#ffe89a', 22); });
  paint(T.NETHERBRICK_T, p=>{ p.fill('#2e1618'); for(let y=0;y<16;y+=4){ p.rect(0,y,16,1,'#1e0e10'); const off=(y/4%2)*4; for(let x=off;x<16;x+=8) p.rect(x,y,1,4,'#1e0e10'); } p.speck('#3e2022', 18); });
  paint(T.PORTAL_T, p=>{ p.fill('#5a1a9a'); p.speck('#7a3ac8', 60); p.speck('#3a0a6a', 45); p.speck('#b88ae8', 22); });
  paint(T.ENDSTONE_T, p=>{ p.fill('#dbde9e'); p.speck('#c6c987', 55); p.speck('#eef0b8', 30); p.speck('#b2b576', 18); });
  paint(T.ENDFRAME_T, p=>{ p.fill('#3a5e50'); p.speck('#2c4a3e', 40); p.rect(0,0,16,2,'#dbde9e'); p.rect(0,14,16,2,'#dbde9e'); p.rect(2,6,3,3,'#dbde9e'); p.rect(11,6,3,3,'#dbde9e'); });
  paint(T.ENDFRAME_LIT_T, p=>{ p.fill('#3a5e50'); p.speck('#2c4a3e', 30); p.rect(4,4,8,8,'#1a2a28'); p.rect(5,5,6,6,'#48e0c8'); p.rect(7,7,2,2,'#d8fff5'); });
  paint(T.ENDPORTAL_T, p=>{ p.fill('#03030a'); p.speck('#2a2a5a', 35); p.speck('#7a7ad8', 14); p.speck('#e8e8ff', 6); p.speck('#48e0c8', 5); });
  paint(T.DRAGONEGG_T, p=>{ p.fill('#15101e'); p.speck('#2a1a3e', 50); p.speck('#5a2a8a', 18); p.speck('#b86af0', 7); });
  paint(T.CRYSTAL_T, p=>{ p.fill('#e85ad8'); p.speck('#c83ab8', 35); p.speck('#ffa8f5', 25); p.rect(6,6,4,4,'#fff0fd'); });
  paint(T.HEALM_T, p=>{ p.fill('#e8e0d8'); p.rect(0,0,16,2,'#c83a3a'); p.rect(0,14,16,2,'#b8b0a8'); p.rect(5,5,6,6,'#c83a3a'); p.rect(7,7,2,2,'#fff'); });
  paint(T.HEALM_TOP_T, p=>{ p.fill('#e8e0d8'); p.rect(2,2,12,12,'#48e0c8'); p.rect(4,4,8,8,'#2aa898'); for(let i=0;i<6;i++) p.px(5+(p.rng()*6|0), 5+(p.rng()*6|0), '#aef5ea'); });
  paint(T.FOSSILM_T, p=>{ p.fill('#8a8278'); p.speck('#6a6258', 30); p.rect(3,3,10,10,'#3a4a58'); p.rect(5,5,6,6,'#7ad0c8'); p.rect(7,7,2,2,'#d8fff5'); });
  paint(T.PC_T, p=>{ p.fill('#c8b89a'); p.rect(2,2,12,9,'#2a3a48'); p.rect(3,3,10,7,'#48c8e8'); p.rect(4,12,8,2,'#8a7a5a'); p.px(12,12,'#c83a3a'); });
  paint(T.FOSSILORE_T, p=>{ p.fill('#7d7d7d'); p.speck('#6a6a6a', 40); p.px(5,5,'#d8cdb8'); p.px(6,5,'#d8cdb8'); p.px(7,6,'#d8cdb8'); p.px(8,7,'#d8cdb8'); p.px(8,8,'#c8bda8'); p.px(7,9,'#d8cdb8'); p.px(6,9,'#d8cdb8'); p.px(10,4,'#c8bda8'); p.px(4,10,'#c8bda8'); p.px(11,10,'#d8cdb8'); p.px(10,11,'#c8bda8'); });
  paint(T.MYSTICORE_T, p=>{ p.fill('#7d7d7d'); p.speck('#6a6a6a', 40); p.rect(4,4,2,2,'#f08020'); p.rect(10,5,2,2,'#48a8e8'); p.rect(5,10,2,2,'#e8d848'); p.rect(10,10,2,2,'#5ac84a'); p.px(8,7,'#c8b8e8'); p.px(7,8,'#c8b8e8'); });
  paint(T.DOOR_T, p=>{ p.fill('#9a7547'); p.rect(0,0,1,16,'#7a5a35'); p.rect(15,0,1,16,'#7a5a35'); p.rect(2,2,5,5,'#b8945f'); p.rect(9,2,5,5,'#b8945f'); p.rect(2,9,5,5,'#b8945f'); p.rect(9,9,5,5,'#b8945f'); p.px(12,8,'#3a3a42'); });
  paint(T.QUARTZ_T, p=>{ p.fill('#6e3533'); p.speck('#5a2a28', 40); for(let i=0;i<5;i++){ const x=1+(p.rng()*13|0), y=1+(p.rng()*13|0); p.rect(x,y,2,2,'#e8dcd0'); p.px(x,y,'#f8f0e8'); } });
  paint(T.CROP2, p=>{ for(let i=0;i<6;i++){ const x=1+i*2+(p.rng()*1|0); p.rect(x,4,1,12,'#b5a23c'); p.rect(x,2,1,3,'#d8c455'); p.px(x-1<0?0:x-1,3,'#d8c455'); p.px(x+1>15?15:x+1,4,'#d8c455'); } });

  // ===== 🌲 지형 바이옴 텍스처 =====
  paint(T.SPRUCE_SIDE, p=>{ p.fill('#4a3826'); for(let x=0;x<16;x+=3){ p.rect(x,0,1,16,'#39291a'); } p.speck('#574330', 30); });
  paint(T.SPRUCE_TOP, p=>{ p.fill('#4a3826'); p.rect(2,2,12,12,'#6e5a40'); p.rect(5,5,6,6,'#574330'); });
  paint(T.SPRUCE_LEAVES_T, p=>{ p.fill('#2e5a30'); p.speck('#244a26', 80); p.speck('#3a6e3c', 60); p.speck('#1c3a1e', 35); });
  paint(T.JUNGLE_SIDE, p=>{ p.fill('#5a4226'); for(let x=0;x<16;x+=4){ p.rect(x,0,2,16,'#46331c'); } p.speck('#6e5230', 30); });
  paint(T.JUNGLE_LEAVES_T, p=>{ p.fill('#2f7a18'); p.speck('#256612', 80); p.speck('#3f9422', 65); p.speck('#1a4a0e', 30); });
  paint(T.CHERRY_SIDE, p=>{ p.fill('#6e4a4e'); for(let x=0;x<16;x+=3){ p.rect(x,0,1,16,'#5a3a3e'); } p.speck('#7e565a', 30); });
  paint(T.CHERRY_TOP, p=>{ p.fill('#6e4a4e'); p.rect(2,2,12,12,'#9a7074'); p.rect(5,5,6,6,'#7e565a'); });
  paint(T.CHERRY_LEAVES_T, p=>{ p.fill('#f0a8d0'); p.speck('#e88ec0', 80); p.speck('#ffc4e0', 65); p.speck('#d878b0', 30); });
  paint(T.MYCELIUM_TOP, p=>{ p.fill('#7a6e7e'); p.speck('#8a7a8e', 50); p.speck('#6a5e6e', 40); p.speck('#9a8a9e', 25); });
  paint(T.MYCELIUM_SIDE, p=>{ p.fill('#866043'); p.rect(0,0,16,4,'#7a6e7e'); p.speck('#79553a', 40); });
  paint(T.RED_SAND_T, p=>{ p.fill('#be6a3a'); p.speck('#a85a30', 60); p.speck('#cc7848', 50); });
  paint(T.TERRACOTTA_T, p=>{ p.fill('#9a5a3c'); p.speck('#8a4e34', 50); p.speck('#aa6a48', 40); p.rect(0,5,16,2,'#7a4028'); p.rect(0,11,16,2,'#aa6a48'); });
  paint(T.DEEPSLATE_T, p=>{ p.fill('#3a3a40'); p.speck('#2e2e34', 60); p.speck('#46464c', 45); p.speck('#28282e', 30); });
  paint(T.PODZOL_TOP, p=>{ p.fill('#5a3e22'); p.speck('#4a3219', 55); p.speck('#6e4e2e', 45); p.speck('#3a2814', 25); });
  paint(T.PODZOL_SIDE, p=>{ p.fill('#866043'); p.rect(0,0,16,4,'#5a3e22'); p.speck('#79553a', 40); });
  paint(T.MUSHROOM_T, p=>{ p.rect(6,9,4,6,'#e8e0d0'); p.rect(4,5,8,5,'#c83a2a'); p.px(6,6,'#f0e8d8'); p.px(9,7,'#f0e8d8'); p.px(8,5,'#f0e8d8'); });

  ATLAS.canvas = cv;
  ATLAS.texture = new THREE.CanvasTexture(cv);
  ATLAS.texture.magFilter = THREE.NearestFilter;
  ATLAS.texture.minFilter = THREE.NearestFilter;
  ATLAS.texture.generateMipmaps = false;
}

// 타일 UV ([u0,v0,u1,v1], three.js는 V축이 아래→위)
function tileUV(tile){
  const c = tile % ATLAS.COLS, r = Math.floor(tile / ATLAS.COLS);
  const s = 1 / ATLAS.COLS, e = 0.002; // 픽셀 블리딩 방지용 inset
  return [c*s+e, 1-(r+1)*s+e, (c+1)*s-e, 1-r*s-e];
}

// ===== 아이콘 =====
const iconCache = {}, iconURLCache = {};
function getIconCanvas(id){
  if(iconCache[id]) return iconCache[id];
  const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if(isBlockId(id)){
    const def = BLOCKS[id];
    if(def.rt === RT.CROSS){
      drawTileFlat(ctx, def.tiles.side, 4, 4, 40);
    } else {
      drawIsoCube(ctx, def.tiles.top, def.tiles.side);
    }
  } else {
    drawItemIcon(ctx, id);
  }
  iconCache[id] = cv;
  return cv;
}
function getIconURL(id){
  if(!iconURLCache[id]) iconURLCache[id] = getIconCanvas(id).toDataURL();
  return iconURLCache[id];
}
function drawTileFlat(ctx, tile, dx, dy, size){
  const sx = (tile % 16) * 16, sy = Math.floor(tile / 16) * 16;
  ctx.drawImage(ATLAS.canvas, sx, sy, 16, 16, dx, dy, size, size);
}
function drawIsoCube(ctx, topTile, sideTile){
  const a = ATLAS.canvas;
  const sT = [(topTile%16)*16, Math.floor(topTile/16)*16];
  const sS = [(sideTile%16)*16, Math.floor(sideTile/16)*16];
  // 윗면
  ctx.setTransform(1.5/1, 0.75/1, -1.5/1, 0.75/1, 24, 0);
  ctx.drawImage(a, sT[0], sT[1], 16, 16, 0, 0, 16, 16);
  // 왼쪽면
  ctx.setTransform(1.5, 0.75, 0, 1.5, 0, 12);
  ctx.drawImage(a, sS[0], sS[1], 16, 16, 0, 0, 16, 16);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, 16, 16);
  // 오른쪽면
  ctx.setTransform(1.5, -0.75, 0, 1.5, 24, 24);
  ctx.drawImage(a, sS[0], sS[1], 16, 16, 0, 0, 16, 16);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, 0, 16, 16);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function drawItemIcon(ctx, id){
  // 16x16 논리 픽셀 → 48px (3배)
  const P = (x, y, c, w, h) => { ctx.fillStyle = c; ctx.fillRect(x*3, y*3, (w||1)*3, (h||1)*3); };
  const tool = toolInfo(id);
  if(tool){
    const matC = ['#9a6b39', '#8c8c8c', '#d8d8d8', '#4ee1d2'][tool.tier];
    if(tool.kind === 'rod'){
      for(let i = 0; i < 10; i++) P(3 + i, 12 - i, '#8a6a3a');
      P(13,2,'#e8e8e8',1,7); P(12,9,'#e8e8e8',2,1); P(12,10,'#e23b3b',2,2);
      return;
    }
    if(tool.kind === 'bow'){
      for(let i = 0; i < 4; i++){ P(5+i, 3+i, '#8a6a3a'); P(5+i, 13-i, '#8a6a3a'); }
      P(9,6,'#8a6a3a',1,4); P(10,7,'#8a6a3a',1,2);
      P(12,3,'#e8e8e8',1,11); P(11,3,'#e8e8e8',2,1); P(11,13,'#e8e8e8',2,1);
      return;
    }
    // 자루 (대각선)
    for(let i = 0; i < 9; i++) P(4 + i, 12 - i, '#8a6a3a');
    if(tool.kind === 'pick'){ P(8,2,matC,6,2); P(13,4,matC,2,2); P(14,6,matC,1,2); P(6,3,matC,2,2); P(5,5,matC,2,1); }
    else if(tool.kind === 'axe'){ P(8,2,matC,4,3); P(7,3,matC,2,4); P(10,5,matC,2,2); }
    else if(tool.kind === 'shovel'){ P(11,2,matC,3,4); P(12,5,matC,2,2); }
    else if(tool.kind === 'hoe'){ P(9,2,matC,5,2); P(8,3,matC,2,2); }
    else { // sword
      ctx.clearRect(0,0,48,48);
      for(let i = 0; i < 8; i++){ P(5+i, 10-i, matC, 2, 1); }
      P(4,12,'#5a4a2a',3,1); P(5,11,'#5a4a2a'); P(3,13,'#8a6a3a',2,2);
    }
    return;
  }
  switch(id){
    case I.STICK: for(let i=0;i<10;i++) P(4+i, 13-i, '#8a6a3a'); break;
    case I.COAL: P(5,5,'#2c2c2c',7,7); P(4,7,'#2c2c2c',2,3); P(11,6,'#222',2,4); P(6,6,'#444',2,2); break;
    case I.IRON_INGOT: case I.GOLD_INGOT: {
      const c = id===I.IRON_INGOT ? '#d8d8d8' : '#fce14c';
      const c2 = id===I.IRON_INGOT ? '#f0f0f0' : '#fff08c';
      P(3,8,c,10,4); P(5,6,c,10,2); P(13,8,c,2,2); P(5,7,c2,8,1); break;
    }
    case I.DIAMOND: P(6,4,'#4ee1d2',4,2); P(4,6,'#4ee1d2',8,3); P(5,9,'#37c9ba',6,2); P(7,11,'#37c9ba',2,2); P(6,5,'#b8f5ef',2,1); break;
    case I.REDSTONE: P(5,9,'#d32222',6,3); P(7,7,'#d32222',3,2); P(4,11,'#a81818',8,1); P(7,8,'#ff5b5b',2,1); break;
    case I.APPLE: P(5,5,'#e23b3b',6,6); P(4,6,'#e23b3b',8,4); P(7,3,'#6b4a2a',1,2); P(8,3,'#3c8a28',2,1); P(5,6,'#ff7b6b',2,2); break;
    case I.PORK_RAW: P(4,6,'#f0a0a8',8,5); P(5,5,'#f0a0a8',6,7); P(6,7,'#f8c8cc',4,2); break;
    case I.PORK_COOKED: P(4,6,'#c87848',8,5); P(5,5,'#c87848',6,7); P(6,7,'#e8a878',4,2); break;
    case I.BEEF_RAW: P(4,6,'#c84444',8,5); P(5,5,'#c84444',6,7); P(6,7,'#e87878',4,2); break;
    case I.BEEF_COOKED: P(4,6,'#7a4a2a',8,5); P(5,5,'#7a4a2a',6,7); P(6,7,'#9a6a44',4,2); break;
    case I.ROTTEN: P(4,6,'#7a8a3a',8,5); P(5,5,'#7a8a3a',6,7); P(6,7,'#5a6a2a',3,2); P(10,8,'#4a5a20',2,2); break;
    case I.BONE: P(4,11,'#f0f0e0',3,3); P(11,4,'#f0f0e0',3,3); for(let i=0;i<7;i++) P(6+i,11-i,'#f0f0e0',2,2); break;
    case I.GUNPOWDER: P(5,9,'#555',6,3); P(7,7,'#555',3,2); P(4,11,'#444',8,1); P(7,8,'#888',2,1); break;
    case I.FEATHER: for(let i=0;i<8;i++){ P(5+i,12-i,'#f0f0f0',3,1); } P(4,13,'#c8c8c8',2,1); break;
    case I.POKEBALL: case I.GREATBALL: case I.ULTRABALL: {
      const top = id===I.POKEBALL ? '#e23b3b' : id===I.GREATBALL ? '#3b6be2' : '#3a3a3a';
      ctx.fillStyle = top; ctx.beginPath(); ctx.arc(24, 24, 16, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(24, 24, 16, 0, Math.PI); ctx.fill();
      if(id===I.GREATBALL){ ctx.fillStyle='#e23b3b'; ctx.fillRect(12,12,7,5); ctx.fillRect(29,12,7,5); }
      if(id===I.ULTRABALL){ ctx.fillStyle='#f5d327'; ctx.fillRect(10,14,10,4); ctx.fillRect(28,14,10,4); }
      ctx.fillStyle = '#222'; ctx.fillRect(8, 22, 32, 4);
      ctx.beginPath(); ctx.arc(24, 24, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(24, 24, 3.5, 0, Math.PI*2); ctx.fill();
      break;
    }
    case I.POTION: P(6,3,'#c8c8d8',4,2); P(5,5,'#d8e8f0',6,3); P(4,8,'#f06b9a',8,5); P(5,7,'#f06b9a',6,2); P(5,9,'#f898bc',2,2); break;
    case I.MASTERBALL: P(3,4,'#8a4ae8',10,5); P(3,9,'#e8e8e8',10,4); P(5,3,'#6a3ac8',6,2); P(6,7,'#f5f5f5',4,3); P(7,8,'#2a2a2a',2,2); P(4,5,'#e8b8f8',2,1); P(10,5,'#e8b8f8',2,1); break;
    case I.GOD_ORB: P(5,3,'#ffe97a',6,2); P(4,4,'#f5d327',8,7); P(6,6,'#fff8d0',4,3); P(5,11,'#c8971a',6,2); P(3,6,'#f5d327',2,3); P(11,6,'#f5d327',2,3); break;
    case I.POKE_BAG: P(3,4,'#d84a3a',10,8); P(3,8,'#e8e8e8',10,4); P(6,6,'#f5f5f5',4,4); P(7,7,'#3a3a3a',2,2); P(5,3,'#b83a2a',6,2); break;
    case I.SUPERPOTION: P(6,3,'#c8c8d8',4,2); P(5,5,'#d8e8f0',6,3); P(4,8,'#58c8e8',8,5); P(5,7,'#58c8e8',6,2); P(5,9,'#9adcf5',2,2); break;
    case I.HYPERPOTION: P(6,3,'#c8c8d8',4,2); P(5,5,'#d8e8f0',6,3); P(4,8,'#e8b820',8,5); P(5,7,'#e8b820',6,2); P(5,9,'#ffe97a',2,2); break;
    case I.SEEDS: P(5,6,'#4fae3a',2,2); P(9,5,'#4fae3a',2,2); P(7,9,'#4fae3a',2,2); P(10,10,'#3e8f2c',2,2); P(4,11,'#3e8f2c',2,2); break;
    case I.WHEAT: for(let i=0;i<4;i++){ const wx=4+i*3; P(wx,4,'#b5a23c',1,9); P(wx-1,2,'#d8c455',3,3); } break;
    case I.BREAD: P(4,6,'#b5803c',9,5); P(5,5,'#c89456',7,2); P(5,8,'#9a6b2c',7,1); break;
    case I.BONEMEAL: P(5,8,'#e8e8e0',6,3); P(7,6,'#e8e8e0',3,2); P(4,10,'#d8d8d0',8,2); break;
    case I.STRING: for(let i=0;i<10;i++) P(4+i, 8+Math.round(Math.sin(i*1.2)*2), '#e8e8e8'); break;
    case I.ARROW: for(let i=0;i<8;i++) P(4+i,12-i,'#8a6a3a'); P(11,3,'#c8c8c8',3,2); P(12,4,'#c8c8c8',2,3); P(3,12,'#e8e8e8',2,3); P(4,13,'#e8e8e8',3,2); break;
    case I.FLINT: P(5,5,'#3a3a42',6,6); P(4,7,'#3a3a42',2,3); P(11,6,'#2a2a32',2,4); P(6,6,'#55555f',2,2); break;
    case I.FISH_RAW: P(4,7,'#8fb6c8',7,4); P(3,8,'#8fb6c8',2,2); P(11,6,'#7aa4b8',3,2); P(11,10,'#7aa4b8',3,2); P(6,8,'#222',1,1); break;
    case I.FISH_COOKED: P(4,7,'#b5803c',7,4); P(3,8,'#b5803c',2,2); P(11,6,'#9a6b2c',3,2); P(11,10,'#9a6b2c',3,2); P(6,8,'#222',1,1); break;
    case I.RARECANDY: P(6,6,'#6bb2e2',5,5); P(7,7,'#9ad0f0',2,2); P(4,5,'#e8e8e8',3,2); P(10,4,'#e8e8e8',2,3); P(11,10,'#e8e8e8',2,2); break;
    case I.EMERALD: P(6,4,'#3ac85a',4,3); P(5,6,'#3ac85a',6,4); P(6,10,'#2aa848',4,2); P(7,5,'#8af0a8',2,2); break;
    case I.ENDERPEARL: P(5,5,'#1a4a48',6,6); P(4,7,'#1a4a48',2,3); P(11,6,'#1a4a48',2,4); P(6,6,'#3a8a88',3,3); P(7,7,'#7ad0c8',1,1); break;
    case I.BADGE_ROCK: P(5,5,'#b8a038',6,6); P(7,4,'#b8a038',2,2); P(6,6,'#d8c058',3,3); break;
    case I.BADGE_WATER: P(5,5,'#5a8fdd',6,6); P(7,4,'#5a8fdd',2,2); P(6,6,'#8ab8f0',3,3); break;
    case I.BADGE_ELEC: P(5,5,'#e8b820',6,6); P(7,4,'#e8b820',2,2); P(6,6,'#f5d868',3,3); break;
    case I.BADGE_FIRE: P(5,5,'#e8633a',6,6); P(7,4,'#e8633a',2,2); P(6,6,'#f59868',3,3); break;
    case I.LEATHER: P(4,6,'#9a6b35',8,6); P(5,5,'#9a6b35',6,8); P(6,7,'#b8854a',4,3); break;
    case I.L_HELM: case I.I_HELM: case I.D_HELM: {
      const c = id===I.L_HELM ? '#9a6b35' : id===I.I_HELM ? '#d8d8d8' : '#4ee1d2';
      P(4,5,c,8,4); P(3,7,c,10,3); P(4,10,c,2,2); P(10,10,c,2,2); break;
    }
    case I.L_CHEST: case I.I_CHEST: case I.D_CHEST: {
      const c = id===I.L_CHEST ? '#9a6b35' : id===I.I_CHEST ? '#d8d8d8' : '#4ee1d2';
      P(4,4,c,8,8); P(2,4,c,2,4); P(12,4,c,2,4); P(6,5,'#00000022',4,2); break;
    }
    case I.L_LEGS: case I.I_LEGS: case I.D_LEGS: {
      const c = id===I.L_LEGS ? '#9a6b35' : id===I.I_LEGS ? '#d8d8d8' : '#4ee1d2';
      P(4,4,c,8,3); P(4,7,c,3,7); P(9,7,c,3,7); break;
    }
    case I.POTION_SPEED: P(6,3,'#c8c8d8',4,2); P(5,5,'#d8e8f0',6,3); P(4,8,'#58c8e8',8,5); P(5,9,'#8adcf5',2,2); break;
    case I.POTION_JUMP: P(6,3,'#c8c8d8',4,2); P(5,5,'#d8e8f0',6,3); P(4,8,'#8ae060',8,5); P(5,9,'#b8f098',2,2); break;
    case I.POTION_REGEN: P(6,3,'#c8c8d8',4,2); P(5,5,'#d8e8f0',6,3); P(4,8,'#f06ba8',8,5); P(5,9,'#f8a8cc',2,2); break;
    case I.QUARTZ: P(6,5,'#e8dcd0',4,5); P(5,7,'#e8dcd0',6,3); P(7,4,'#f8f0e8',2,2); break;
    case I.GLOWDUST: P(5,9,'#f5d878',6,3); P(7,7,'#f5d878',3,2); P(4,11,'#e8c858',8,1); P(7,8,'#ffe89a',2,1); break;
    case I.BLAZE_ROD: for(let i=0;i<9;i++) P(5+i*0.7|0, 13-i, '#f0a020'); P(5,12,'#ffce3d',2,2); P(10,5,'#ffce3d',2,2); break;
    case I.FIRE_STONE: P(5,4,'#c84a1a',6,8); P(6,5,'#f08020',4,6); P(7,6,'#ffce3d',2,2); break;
    case I.WATER_STONE: P(5,4,'#1a5ac8',6,8); P(6,5,'#48a8e8',4,6); P(7,6,'#aee0f5',2,2); break;
    case I.THUNDER_STONE: P(5,4,'#b8a818',6,8); P(6,5,'#e8d848',4,6); P(8,5,'#fff8a8',1,4); P(7,9,'#fff8a8',1,2); break;
    case I.LEAF_STONE: P(5,4,'#2a7a1a',6,8); P(6,5,'#5ac84a',4,6); P(7,6,'#a8e898',2,3); break;
    case I.MOON_STONE: P(5,4,'#5a4a78',6,8); P(6,5,'#9a8ab8',4,6); P(7,6,'#e8d8ff',2,2); break;
    case I.FOSSIL_HELIX: P(4,4,'#c8bda8',8,8); P(6,6,'#8a7d68',4,4); P(7,7,'#c8bda8',2,2); P(5,5,'#8a7d68',1,1); break;
    case I.FOSSIL_DOME: P(4,6,'#c8bda8',8,6); P(5,4,'#c8bda8',6,3); P(6,6,'#8a7d68',1,5); P(9,6,'#8a7d68',1,5); break;
    case I.FOSSIL_AMBER: P(5,4,'#c87d1a',6,8); P(6,5,'#e8a838',4,6); P(7,7,'#3a6a2a',2,2); break;
    case I.MEGA_STONE: P(4,4,'#7838b8',8,8); P(5,5,'#a858e8',6,6); P(6,6,'#e8c8ff',2,2); P(9,8,'#e84d60',2,2); P(7,9,'#48e0c8',2,2); break;
    case I.LINK_CABLE: P(3,7,'#48a8e8',3,3); P(10,7,'#48a8e8',3,3); for(let i=0;i<5;i++) P(5+i,8+((i%2)|0),'#8a8a95',1,1); P(4,8,'#aee0f5',1,1); P(11,8,'#aee0f5',1,1); break;
    case I.BUCKET: P(4,6,'#b8b8c0',8,1); P(4,7,'#9a9aa5',1,5); P(11,7,'#9a9aa5',1,5); P(5,11,'#9a9aa5',6,2); P(5,5,'#7a7a85',6,1); break;
    case I.WATER_BUCKET: P(4,6,'#b8b8c0',8,1); P(4,7,'#9a9aa5',1,5); P(11,7,'#9a9aa5',1,5); P(5,11,'#9a9aa5',6,2); P(5,6,'#3f76e4',6,3); break;
    case I.LAVA_BUCKET: P(4,6,'#b8b8c0',8,1); P(4,7,'#9a9aa5',1,5); P(11,7,'#9a9aa5',1,5); P(5,11,'#9a9aa5',6,2); P(5,6,'#f08020',6,3); break;
    case I.ENDER_EYE: P(5,5,'#1a3e2a',6,6); P(4,7,'#1a3e2a',2,3); P(11,6,'#1a3e2a',2,4); P(6,6,'#3aa848',3,3); P(7,7,'#a8f0b8',1,1); break;
    case I.FLINT_STEEL: P(4,5,'#3a3a42',5,5); P(9,8,'#c8c8c8',4,2); P(10,6,'#c8c8c8',2,5); break;
    case I.GOLDEN_APPLE: P(5,5,'#fce14c',6,6); P(4,6,'#fce14c',8,4); P(7,3,'#6b4a2a',1,2); P(8,3,'#3c8a28',2,1); P(5,6,'#fff08c',2,2); break;
    default: P(4,4,'#f0f','8',8); break;
  }
}

// ===== 조합법 =====
// p: 모양 패턴(문자열 배열), k: 문자→아이템, sl: 셰이프리스 [[id,개수],...], out: [id, n]
const RECIPES = [
  { sl:[[B.LOG,1]], out:[B.PLANKS,4] },
  { sl:[[B.BIRCH_LOG,1]], out:[B.PLANKS,4] },
  { sl:[[B.ACACIA_LOG,1]], out:[B.PLANKS,4] },
  { sl:[[B.SPRUCE_LOG,1]], out:[B.PLANKS,4] },
  { sl:[[B.JUNGLE_LOG,1]], out:[B.PLANKS,4] },
  { sl:[[B.CHERRY_LOG,1]], out:[B.PLANKS,4] },
  { p:['.G.','DOD','OOO'], k:{G:B.GLASS, D:I.DIAMOND, O:B.OBSIDIAN}, out:[B.ENCHANT,1] },
  { p:['P','P'], k:{P:B.PLANKS}, out:[I.STICK,4] },
  { p:['PP','PP'], k:{P:B.PLANKS}, out:[B.CRAFT,1] },
  { p:['C','S'], k:{C:I.COAL, S:I.STICK}, out:[B.TORCH,4] },
  { p:['CCC','C C','CCC'], k:{C:B.COBBLE}, out:[B.FURNACE,1] },
  { sl:[[B.STONE,4]], out:[B.STONEBRICK,4] },
  { sl:[[B.STONEBRICK,4]], out:[B.BRICKS,4] },
  { p:['WWW','PPP'], k:{W:B.WOOL, P:B.PLANKS}, out:[B.BED,1] },
  { p:['GSG','SGS','GSG'], k:{G:I.GUNPOWDER, S:B.SAND}, out:[B.TNT,1] },
  // 도구 (재료 M: 판자/조약돌/철/다이아)
  ...[[B.PLANKS,'WOOD'], [B.COBBLE,'STONE'], [I.IRON_INGOT,'IRON'], [I.DIAMOND,'DIA']].flatMap(([mat, pre])=>[
    { p:['MMM',' S ',' S '], k:{M:mat, S:I.STICK}, out:[I[pre+'_PICK'],1] },
    { p:['MM','MS',' S'], k:{M:mat, S:I.STICK}, out:[I[pre+'_AXE'],1] },
    { p:['M','S','S'], k:{M:mat, S:I.STICK}, out:[I[pre+'_SHOVEL'],1] },
    { p:['M','M','S'], k:{M:mat, S:I.STICK}, out:[I[pre+'_SWORD'],1] },
    { p:['MM',' S',' S'], k:{M:mat, S:I.STICK}, out:[I[pre+'_HOE'],1] },
  ]),
  // 농사/낚시/전투
  { p:['WWW'], k:{W:I.WHEAT}, out:[I.BREAD,1] },
  { sl:[[I.BONE,1]], out:[I.BONEMEAL,3] },
  { sl:[[B.WOOL,1]], out:[I.STRING,4] },
  { p:['PPP','P P','PPP'], k:{P:B.PLANKS}, out:[B.CHEST,1] },
  { p:['  S',' SX','S X'], k:{S:I.STICK, X:I.STRING}, out:[I.FISHING_ROD,1] },
  { p:[' SX','S X',' SX'], k:{S:I.STICK, X:I.STRING}, out:[I.BOW,1] },
  { p:['F','S','E'], k:{F:I.FLINT, S:I.STICK, E:I.FEATHER}, out:[I.ARROW,4] },
  // 포켓볼
  { p:[' I ','IRI',' I '], k:{I:I.IRON_INGOT, R:I.REDSTONE}, out:[I.POKEBALL,3] },
  { p:[' G ','IRI',' I '], k:{G:I.GOLD_INGOT, I:I.IRON_INGOT, R:I.REDSTONE}, out:[I.GREATBALL,3] },
  { p:[' D ','IRI',' I '], k:{D:I.DIAMOND, I:I.IRON_INGOT, R:I.REDSTONE}, out:[I.ULTRABALL,3] },
  { sl:[[I.ULTRABALL,3],[I.MEGA_STONE,1],[I.RARECANDY,2],[I.EMERALD,3]], out:[I.MASTERBALL,1] },
  { sl:[[I.MEGA_STONE,1],[I.DIAMOND,4],[I.ULTRABALL,1],[I.RARECANDY,2]], out:[I.GOD_ORB,1] },
  { sl:[[B.FLOWER_R,2],[I.APPLE,1]], out:[I.POTION,2] },
  { sl:[[I.POTION,2],[I.REDSTONE,1]], out:[I.SUPERPOTION,1] },
  { sl:[[I.SUPERPOTION,2],[I.GOLD_INGOT,1]], out:[I.HYPERPOTION,1] },
  { p:['GGG','GAG','GGG'], k:{G:I.GOLD_INGOT, A:I.APPLE}, out:[I.GOLDEN_APPLE,1] },
  // 갑옷
  ...[[I.LEATHER,'L'], [I.IRON_INGOT,'I'], [I.DIAMOND,'D']].flatMap(([mat, pre])=>[
    { p:['MMM','M.M'], k:{M:mat}, out:[I[pre+'_HELM'],1] },
    { p:['M.M','MMM','MMM'], k:{M:mat}, out:[I[pre+'_CHEST'],1] },
    { p:['MMM','M.M','M.M'], k:{M:mat}, out:[I[pre+'_LEGS'],1] },
  ]),
  // 레드스톤 간이
  { p:['S','C'], k:{S:I.STICK, C:B.COBBLE}, out:[B.LEVER_OFF,1] },
  { p:['.R.','RGR','.R.'], k:{R:I.REDSTONE, G:B.GLASS}, out:[B.LAMP_OFF,1] },
  { p:['II','II','II'], k:{I:I.IRON_INGOT}, out:[B.IRON_DOOR,1] },
  // 물약
  { sl:[[I.WHEAT,2],[I.REDSTONE,1]], out:[I.POTION_SPEED,1] },
  { sl:[[I.FEATHER,2],[I.REDSTONE,1]], out:[I.POTION_JUMP,1] },
  { sl:[[I.APPLE,2],[I.REDSTONE,1]], out:[I.POTION_REGEN,1] },
  { sl:[[I.IRON_INGOT,1],[I.FLINT,1]], out:[I.FLINT_STEEL,1] },
  { p:['GG','GG'], k:{G:I.GLOWDUST}, out:[B.GLOWSTONE,1] },
  { sl:[[I.ENDERPEARL,1],[I.BLAZE_ROD,1]], out:[I.ENDER_EYE,1] },
  // 🔮 엔드 크리스탈: 유리7 + 엔더의 눈 + 블레이즈 막대 (엔더드래곤 부활용 — 귀환 포탈 4변에 설치)
  { p:['GGG','GEG','GBG'], k:{G:B.GLASS, E:I.ENDER_EYE, B:I.BLAZE_ROD}, out:[B.END_CRYSTAL,1] },
  { p:['IDI','IRI','III'], k:{I:I.IRON_INGOT, D:I.DIAMOND, R:I.REDSTONE}, out:[B.HEAL_MACHINE,1] },
  { p:['IGI','IRI','III'], k:{I:I.IRON_INGOT, G:B.GLASS, R:I.REDSTONE}, out:[B.FOSSIL_MACHINE,1] },
  { p:['GGG','IRI','IPI'], k:{G:B.GLASS, I:I.IRON_INGOT, R:I.REDSTONE, P:B.PLANKS}, out:[B.PC_BLOCK,1] },
  { p:['I I',' I '], k:{I:I.IRON_INGOT}, out:[I.BUCKET,1] },
  { sl:[[I.IRON_INGOT,2],[I.REDSTONE,2],[I.ENDERPEARL,1]], out:[I.LINK_CABLE,1] },
  { p:['DSD','SES','DSD'], k:{D:I.DIAMOND, S:I.FIRE_STONE, E:I.ENDERPEARL}, out:[I.MEGA_STONE,1] },
  { p:['PP','PP','PP'], k:{P:B.PLANKS}, out:[B.DOOR,1] },
  { sl:[[I.QUARTZ,4]], out:[I.EMERALD,2] },
];

// 레시피 패턴 → 2차원 id 배열
function recipeGrid(r){
  return r.p.map(row => row.split('').map(ch => (ch === ' ' || ch === '.') ? 0 : r.k[ch]));
}

// cells: 길이 4 또는 9의 [{id,n}|null], w: 2 또는 3 → {recipe, out:[id,n]} | null
function matchCraft(cells, w){
  const h = cells.length / w;
  // 그리드 → id 행렬 + 바운딩 박스
  let minX = 99, minY = 99, maxX = -1, maxY = -1;
  const g = [];
  for(let y = 0; y < h; y++){
    g[y] = [];
    for(let x = 0; x < w; x++){
      const c = cells[y*w + x];
      g[y][x] = c ? c.id : 0;
      if(c){ minX = Math.min(minX,x); maxX = Math.max(maxX,x); minY = Math.min(minY,y); maxY = Math.max(maxY,y); }
    }
  }
  if(maxX < 0) return null; // 비어 있음
  const tw = maxX - minX + 1, th = maxY - minY + 1;
  const trimmed = [];
  for(let y = 0; y < th; y++){ trimmed[y] = []; for(let x = 0; x < tw; x++){ trimmed[y][x] = g[minY+y][minX+x]; } }

  // 아이템 개수 맵 (셰이프리스용)
  const counts = {};
  let cellCount = 0;
  cells.forEach(c => { if(c){ counts[c.id] = (counts[c.id]||0) + 1; cellCount++; } });

  for(const r of RECIPES){
    if(r.sl){
      if(r.sl.length !== Object.keys(counts).length) continue;
      if(r.sl.reduce((s,[,n])=>s+n,0) !== cellCount) continue;
      if(r.sl.every(([id,n]) => counts[id] === n)) return { recipe:r, out:r.out };
      continue;
    }
    const rg = recipeGrid(r);
    const rh = rg.length, rw = rg[0].length;
    if(rw !== tw || rh !== th) continue;
    let ok = true, okMir = true;
    for(let y = 0; y < th && (ok || okMir); y++){
      for(let x = 0; x < tw; x++){
        if(rg[y][x] !== trimmed[y][x]) ok = false;
        if(rg[y][tw-1-x] !== trimmed[y][x]) okMir = false;
      }
    }
    if(ok || okMir) return { recipe:r, out:r.out };
  }
  return null;
}

// ===== 제련 =====
const SMELT = {
  [B.IRON_ORE]: [I.IRON_INGOT, 1],
  [B.GOLD_ORE]: [I.GOLD_INGOT, 1],
  [B.SAND]: [B.GLASS, 1],
  [B.COBBLE]: [B.STONE, 1],
  [B.LOG]: [I.COAL, 1],
  [B.SPRUCE_LOG]: [I.COAL, 1],
  [B.JUNGLE_LOG]: [I.COAL, 1],
  [B.CHERRY_LOG]: [I.COAL, 1],
  [B.RED_SAND]: [B.GLASS, 1],
  [I.PORK_RAW]: [I.PORK_COOKED, 1],
  [I.BEEF_RAW]: [I.BEEF_COOKED, 1],
  [I.FISH_RAW]: [I.FISH_COOKED, 1],
};
// 연료: 제련 가능 아이템 수
const FUEL = { [I.COAL]:8, [B.PLANKS]:1.5, [B.LOG]:1.5, [B.SPRUCE_LOG]:1.5, [B.JUNGLE_LOG]:1.5, [B.CHERRY_LOG]:1.5, [I.STICK]:0.5, [B.CRAFT]:1.5 };
const SMELT_TIME = 4; // 1개당 초

// 🎒 포켓몬 가방에 자동 수납되는 아이템들
const POKE_ITEM_SET = new Set([
  I.POKEBALL, I.GREATBALL, I.ULTRABALL, I.MASTERBALL, I.GOD_ORB, I.POTION, I.SUPERPOTION, I.HYPERPOTION,
  I.RARECANDY, I.FIRE_STONE, I.WATER_STONE, I.THUNDER_STONE, I.LEAF_STONE, I.MOON_STONE,
  I.FOSSIL_HELIX, I.FOSSIL_DOME, I.FOSSIL_AMBER, I.LINK_CABLE, I.MEGA_STONE
].filter(x => x !== undefined));
