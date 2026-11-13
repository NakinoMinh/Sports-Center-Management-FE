import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * React chỉ bắt lỗi render qua class component — không có hook tương đương, nên
 * đây là ngoại lệ duy nhất với quy ước "chỉ dùng function component".
 *
 * Không có ranh giới này thì một lỗi render bất kỳ sẽ gỡ toàn bộ cây React và
 * người dùng nhận một trang trắng không nói được điều gì, còn lỗi thật thì chỉ
 * nằm trong console. Ở đây ít nhất màn hình còn nói được chuyện gì hỏng và chỗ
 * nào hỏng để báo lại.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Lỗi render không bắt được:", error, info.componentStack);
  }

  private readonly handleRetry = () => {
    this.setState({ error: null });
  };

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="panel access-message">
        <span className="eyebrow">Sự cố hiển thị</span>
        <h1>Không hiển thị được nội dung trang này</h1>
        <p>
          Trang gặp lỗi khi dựng giao diện nên phần nội dung đã dừng lại. Bạn có
          thể thử lại, hoặc gửi đoạn mô tả lỗi bên dưới cho đội kỹ thuật.
        </p>
        <pre className="error-boundary-detail">{error.message}</pre>
        <button className="button secondary" onClick={this.handleRetry}>
          Thử hiển thị lại
        </button>
      </div>
    );
  }
}
