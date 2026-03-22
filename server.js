/**
 * VIT Chennai Campus Navigation System — SINGLE FILE SERVER
 * No subfolders needed. Just place in your project folder and run: npm run dev
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// ─── DATA ─────────────────────────────────────────────────────────────────────
const buildings = [
  { id:1,  name:'Academic Block 1 (AB-1)', shortName:'AB-1',       category:'academic', x:42, y:55, timings:'8:00 AM – 9:00 PM', status:'open', facilities:['Classrooms','Labs','Seminar Halls','Lift'],                  contact:'044-3993 1100', capacity:2000, color:'#2196F3', floors:6, description:'Main academic block with classrooms, computer labs and seminar halls across 6 floors.' },
  { id:2,  name:'Academic Block 2 (AB-2)', shortName:'AB-2',       category:'academic', x:38, y:22, timings:'8:00 AM – 9:00 PM', status:'open', facilities:['Research Labs','Faculty Cabins','Conference Room'],           contact:'044-3993 1101', capacity:1500, color:'#2196F3', floors:5, description:'Research activities, faculty offices and advanced labs for School of Computer Science.' },
  { id:3,  name:'Academic Block 3 (AB-3)', shortName:'AB-3',       category:'academic', x:35, y:37, timings:'8:00 AM – 9:00 PM', status:'open', facilities:['Classrooms','Project Labs','Discussion Rooms'],              contact:'044-3993 1102', capacity:1800, color:'#2196F3', floors:5, description:'Third academic block for Electronics, Mechanical and Civil Engineering departments.' },
  { id:4,  name:'Central Library',         shortName:'Library',    category:'library',  x:72, y:52, timings:'8:00 AM – 12:00 AM',status:'open', facilities:['Digital Library','Study Halls','Printing','Wi-Fi','Journals'],contact:'044-3993 1200', capacity:800,  color:'#9C27B0', floors:3, description:'Over 100,000 books, e-journal subscriptions and 24-hour digital access zones.' },
  { id:5,  name:'Admin Block',             shortName:'Admin',      category:'admin',    x:82, y:52, timings:'9:00 AM – 5:00 PM', status:'open', facilities:['Admissions','Accounts','Registrar','HR'],                    contact:'044-3993 1000', capacity:300,  color:'#FF9800', floors:4, description:'Central administrative hub for admissions, fee payment and examination branch.' },
  { id:6,  name:'Hostel A-Block',          shortName:'Hostel A',   category:'hostel',   x:12, y:62, timings:'24/7',               status:'open', facilities:['Single Rooms','Mess Hall','Common Room','Laundry'],          contact:'044-3993 1300', capacity:600,  color:'#4CAF50', floors:5, description:"Boys' hostel with single and double occupancy rooms and 24/7 security." },
  { id:7,  name:'Hostel B-Block',          shortName:'Hostel B',   category:'hostel',   x:62, y:12, timings:'24/7',               status:'open', facilities:['AC Rooms','Mess Hall','Gym','Common Room'],                  contact:'044-3993 1301', capacity:500,  color:'#4CAF50', floors:5, description:"Boys' hostel B-Block offering AC and non-AC rooms with in-house gymnasium." },
  { id:8,  name:'Hostel C-Block',          shortName:'Hostel C',   category:'hostel',   x:50, y:10, timings:'24/7',               status:'open', facilities:['Girls Hostel','Mess Hall','Medical Room','Common Room'],     contact:'044-3993 1302', capacity:600,  color:'#E91E63', floors:5, description:"Girls' hostel with dedicated mess, medical room and 24-hour warden access." },
  { id:9,  name:'Hostel D-Block',          shortName:'Hostel D',   category:'hostel',   x:24, y:85, timings:'24/7',               status:'open', facilities:['Single Rooms','Mess Hall','Study Room'],                    contact:'044-3993 1303', capacity:500,  color:'#4CAF50', floors:4, description:'Hostel for senior students and research scholars with study lounge.' },
  { id:10, name:'Gym Khanna',              shortName:'Gym',        category:'sports',   x:45, y:82, timings:'6:00 AM – 10:00 PM', status:'open', facilities:['Gymnasium','Indoor Courts','Yoga Room','Changing Rooms'],   contact:'044-3993 1400', capacity:200,  color:'#F44336', floors:2, description:'Multi-purpose gymnasium with modern equipment, courts and yoga studio.' },
  { id:11, name:'Swimming Pool',           shortName:'Pool',       category:'sports',   x:82, y:10, timings:'6:00 AM – 8:00 PM',  status:'open', facilities:['Olympic Pool','Changing Rooms','Coaching'],                 contact:'044-3993 1401', capacity:100,  color:'#F44336', floors:1, description:'Semi-Olympic pool with professional coaching. Lifeguard on duty at all times.' },
  { id:12, name:'MG Auditorium',           shortName:'Auditorium', category:'facility', x:88, y:30, timings:'8:00 AM – 10:00 PM', status:'open', facilities:['1200-seat Hall','Stage','AV System','AC'],                  contact:'044-3993 1500', capacity:1200, color:'#795548', floors:2, description:"VIT Chennai's premier event venue with stage and modern audio-visual systems." },
  { id:13, name:'Health Centre',           shortName:'Health',     category:'facility', x:68, y:12, timings:'24/7',               status:'open', facilities:['OPD','Emergency','Pharmacy','Ambulance','Lab'],             contact:'044-3993 1555', capacity:50,   color:'#F44336', floors:2, description:'24/7 health centre with doctors, nurses, pharmacy and ambulance service.' },
  { id:14, name:'Reception',               shortName:'Reception',  category:'admin',    x:88, y:63, timings:'8:00 AM – 8:00 PM',  status:'open', facilities:['Visitor Passes','Information Desk','Security'],             contact:'044-3993 1001', capacity:30,   color:'#FF9800', floors:1, description:'Main reception for visitors. Issues visitor passes and provides campus information.' },
  { id:15, name:'Alpha Block',             shortName:'Alpha',      category:'academic', x:10, y:42, timings:'9:00 AM – 6:00 PM',  status:'open', facilities:['Specialized Labs','Faculty Offices'],                       contact:'044-3993 1103', capacity:400,  color:'#2196F3', floors:3, description:'Specialized research labs and faculty offices for senior professors.' },
  { id:16, name:'Delta Block',             shortName:'Delta',      category:'academic', x:72, y:22, timings:'8:00 AM – 9:00 PM',  status:'open', facilities:['Incubation Centre','Startup Labs','Collaboration Spaces'],  contact:'044-3993 1104', capacity:350,  color:'#00BCD4', floors:4, description:'Innovation and entrepreneurship hub with incubation centre for student startups.' },
  { id:17, name:'V-Mart (Shopping)',        shortName:'V-Mart',     category:'facility', x:10, y:33, timings:'8:00 AM – 10:00 PM', status:'open', facilities:['Stationery','Groceries','Clothing','Electronics'],          contact:'044-3993 1600', capacity:100,  color:'#795548', floors:1, description:'Campus store offering daily essentials and stationery at student-friendly prices.' },
  { id:18, name:'Guest House',             shortName:'Guest House',category:'facility', x:60, y:75, timings:'24/7',               status:'open', facilities:['AC Rooms','Conference Room','Dining'],                      contact:'044-3993 1700', capacity:40,   color:'#607D8B', floors:2, description:'On-campus guest house for visiting faculty, parents and official guests.' },
];

const graph = {
  1:{2:4,3:3,4:5,10:6,15:8}, 2:{1:4,3:2,15:7,16:9}, 3:{1:3,2:2,15:6},
  4:{1:5,5:3,12:6,14:4},     5:{4:3,14:2,12:5},      6:{1:10,3:8,10:7,15:9},
  7:{8:3,13:5,16:6},         8:{7:3,13:4},            9:{10:5,6:8},
  10:{9:5,6:7,1:6,18:4},     11:{7:7,13:6},           12:{4:6,5:5,13:8},
  13:{8:4,7:5,11:6},         14:{5:2,4:4},            15:{1:8,2:7,3:6,17:3},
  16:{2:9,7:6},              17:{15:3,6:6},            18:{10:4,9:6,4:7},
};

const bookmarkStore = new Map();

function dijkstra(start, end) {
  const distances = {}, prev = {}, visited = new Set();
  const nodes = Object.keys(graph).map(Number);
  nodes.forEach(n => { distances[n] = Infinity; prev[n] = null; });
  distances[start] = 0;
  while (true) {
    let u = null, minDist = Infinity;
    nodes.forEach(n => { if (!visited.has(n) && distances[n] < minDist) { minDist = distances[n]; u = n; } });
    if (u === null || u === end) break;
    visited.add(u);
    Object.entries(graph[u] || {}).forEach(([vStr, w]) => {
      const v = parseInt(vStr);
      if (!visited.has(v) && distances[u] + w < distances[v]) { distances[v] = distances[u] + w; prev[v] = u; }
    });
  }
  const path = []; let cur = end;
  while (cur !== null) { path.unshift(cur); cur = prev[cur]; }
  return path[0] === start ? { path, distance: distances[end] } : { path: [], distance: Infinity };
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api/buildings', (req, res) => {
  const { category } = req.query;
  const result = category && category !== 'all' ? buildings.filter(b => b.category === category) : buildings;
  res.json({ success: true, count: result.length, data: result });
});

app.get('/api/buildings/:id', (req, res) => {
  const b = buildings.find(b => b.id === parseInt(req.params.id));
  if (!b) return res.status(404).json({ success: false, error: 'Building not found' });
  res.json({ success: true, data: b });
});

app.get('/api/stats', (req, res) => {
  const byCategory = buildings.reduce((acc, b) => { acc[b.category] = (acc[b.category]||0)+1; return acc; }, {});
  res.json({ success: true, data: { totalBuildings: buildings.length, openNow: buildings.filter(b=>b.status==='open').length, totalCapacity: buildings.reduce((a,b)=>a+b.capacity,0), byCategory } });
});

app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.status(400).json({ success: false, error: 'Query too short' });
  const term = q.toLowerCase().trim();
  const results = buildings.map(b => {
    let score = 0;
    if (b.name.toLowerCase().includes(term)) score += 10;
    if (b.shortName.toLowerCase().includes(term)) score += 8;
    if (b.category.toLowerCase().includes(term)) score += 5;
    if (b.description.toLowerCase().includes(term)) score += 3;
    b.facilities.forEach(f => { if (f.toLowerCase().includes(term)) score += 4; });
    return { ...b, _score: score };
  }).filter(b => b._score > 0).sort((a,b) => b._score - a._score).map(({_score,...b}) => b);
  res.json({ success: true, query: q, count: results.length, data: results });
});

app.post('/api/pathfinder', (req, res) => {
  const { startId, endId } = req.body;
  if (!startId || !endId) return res.status(400).json({ success: false, error: 'startId and endId required' });
  const start = parseInt(startId), end = parseInt(endId);
  if (start === end) return res.status(400).json({ success: false, error: 'Start and destination cannot be the same' });
  const startB = buildings.find(b=>b.id===start), endB = buildings.find(b=>b.id===end);
  if (!startB || !endB) return res.status(404).json({ success: false, error: 'Building not found' });
  const { path, distance } = dijkstra(start, end);
  if (!path.length) return res.status(404).json({ success: false, error: 'No path found' });
  const steps = path.map(id => { const b=buildings.find(b=>b.id===id); return {id:b.id,name:b.name,x:b.x,y:b.y}; });
  res.json({ success: true, data: { from:{id:startB.id,name:startB.name}, to:{id:endB.id,name:endB.name}, steps, distance, estimatedWalkTime:`~${Math.ceil((distance*20)/60)} min`, stepCount:path.length } });
});

app.get('/api/bookmarks', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId required' });
  if (!bookmarkStore.has(sessionId)) bookmarkStore.set(sessionId, new Set());
  const data = [...bookmarkStore.get(sessionId)].map(id => buildings.find(b=>b.id===id)).filter(Boolean);
  res.json({ success: true, data });
});

app.post('/api/bookmarks', (req, res) => {
  const { sessionId, buildingId } = req.body;
  if (!sessionId || !buildingId) return res.status(400).json({ success: false, error: 'sessionId and buildingId required' });
  const building = buildings.find(b=>b.id===parseInt(buildingId));
  if (!building) return res.status(404).json({ success: false, error: 'Building not found' });
  if (!bookmarkStore.has(sessionId)) bookmarkStore.set(sessionId, new Set());
  bookmarkStore.get(sessionId).add(parseInt(buildingId));
  res.json({ success: true, message: `${building.name} bookmarked.`, data: building });
});

app.delete('/api/bookmarks/:buildingId', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId required' });
  if (!bookmarkStore.has(sessionId)) bookmarkStore.set(sessionId, new Set());
  bookmarkStore.get(sessionId).delete(parseInt(req.params.buildingId));
  res.json({ success: true, message: 'Bookmark removed.' });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log('\n🚀  VIT Campus Navigation running at http://localhost:' + PORT);
  console.log('✅  All routes ready | Frontend served from /public\n');
});
