import '../../styles/LoadingFailure.scss';

export default function LoadingFailure() {
  return <div className="loading-failure" role="alert">
    <div>
      <h1>这一页暂时没能打开</h1>
      <p>资源加载遇到了问题，可以重新加载，或回到入口再试一次。</p>
      <button type="button" onClick={() => window.location.reload()}>重新加载</button>
      <a href="/">返回入口</a>
    </div>
  </div>;
}
