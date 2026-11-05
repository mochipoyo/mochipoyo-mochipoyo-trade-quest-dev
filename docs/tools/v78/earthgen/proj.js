// ミラー図法（東西は一周する）。x = (lon - LON0) mod 360 * PER、y は北 80° を 0 に
const W = 1440, H = 840, LON0 = -169, PER = W / 360;
const R = W / (2 * Math.PI);
const Y = (lat) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * Math.PI / 180));
const YMAX = Y(80);
const yOf = (lat) => (YMAX - Y(lat)) * R;
const latOf = (y) => { const v = YMAX - y / R; return (Math.atan(Math.exp(v / 1.25)) - Math.PI / 4) / 0.4 * 180 / Math.PI; };
const xOf = (lon) => { let d = lon - LON0; d = ((d % 360) + 360) % 360; return d * PER; };
const lonOf = (x) => { let l = LON0 + x / PER; if (l > 180) l -= 360; return l; };
module.exports = { W, H, LON0, PER, R, Y, YMAX, yOf, latOf, xOf, lonOf };
