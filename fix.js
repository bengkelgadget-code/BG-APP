const fs = require('fs');
let content = fs.readFileSync('ui_components.js', 'utf8');
let badIdx = content.indexOf('w i n d o w . s o r t T a b l e');
if (badIdx !== -1) {
    content = content.substring(0, badIdx);
}
content = content.trim();

let addition = `
window.sortTable = function(colIndex) {
    var sheet = isKonterMode ? 'DB_konter' : (currentConfig ? currentConfig.sheet : null);
    if(!sheet) return;
    var sortStr = localStorage.getItem('sortState_' + sheet);
    var sortObj = sortStr ? JSON.parse(sortStr) : { col: -1, asc: true };
    if (sortObj.col === colIndex) {
        sortObj.asc = !sortObj.asc;
    } else {
        sortObj.col = colIndex;
        sortObj.asc = true;
    }
    localStorage.setItem('sortState_' + sheet, JSON.stringify(sortObj));
    window.forceRebuildHeader = true;
    loadTableData(false);
};
`;
fs.writeFileSync('ui_components.js', content + '\n\n' + addition, 'utf8');
console.log('Fixed!');
