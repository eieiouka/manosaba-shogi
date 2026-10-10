import './rank-display.css';

function kanjiNumber(value) {
  const digits = '〇一二三四五六七八九';
  const units = ['', '十', '百', '千'];
  const groups = ['', '万', '億', '兆', '京'];
  let n = BigInt(value), result = '', group = 0;
  if (n === 0n) return '〇';
  while (n > 0n) {
    if (group >= groups.length) return value;
    let part = Number(n % 10000n), text = '';
    for (let i = 0; i < 4; i++) {
      const digit = part % 10;
      if (digit) text = (digit === 1 && i > 0 ? '' : digits[digit]) + units[i] + text;
      part = Math.floor(part / 10);
    }
    if (text) result = text + groups[group] + result;
    n /= 10000n;
    group++;
  }
  return result;
}

export default function RankLabel({rank}) {
  const text = String(rank);
  const dan = text.match(/^(\d+)段$/);
  if (dan) {
    return <span className="rank-label">{BigInt(dan[1]) === 1n ? '初段' : kanjiNumber(dan[1]) + '段'}</span>;
  }
  return <span className="rank-label">{text.split(/(\d+)/).map((part,index) =>
    /^\d+$/.test(part) ? <span className="rank-number" key={index}>{part}</span> : part
  )}</span>;
}
