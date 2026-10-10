import './rank-display.css';
export default function RankLabel({rank}){
 return <span className="rank-label">{String(rank).split(/(\d+)/).map((part,index)=>/^\d+$/.test(part)?<span className="rank-number" key={index}>{part}</span>:part)}</span>;
}
