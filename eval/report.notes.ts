export function headlineNote(excluded: number): string {
  return (
    '<p class="note">上方汇总已排除 ' +
    excluded +
    ' 个括号危险任务（见 <a href="#bracket-success">括号危险可靠性单元</a>）。</p>'
  );
}
