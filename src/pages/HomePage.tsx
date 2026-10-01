import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  Dumbbell,
  Flame,
  Leaf,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import type { MembershipPackage } from "../types/membership";
import { membershipApi } from "../services/membershipApi";
import { durationLabel, formatMoney } from "../utils/format";
import { homeForRole } from "../utils/navigation";
import "../styles/homepage.css";

const activities = [
  {
    id: "strength",
    label: "Gym & sức mạnh",
    icon: Dumbbell,
    kicker: "01 / STRONGER EVERY DAY",
    title: "Xây nền tảng khỏe.\nBứt phá giới hạn riêng.",
    description:
      "Bắt đầu từ những chuyển động cơ bản, tăng dần cường độ và cảm nhận sự thay đổi của chính mình. Một hành trình phù hợp cho cả người mới lẫn người đã có kinh nghiệm tập luyện.",
    benefits: [
      "Phát triển sức mạnh & sức bền",
      "Cải thiện thể lực toàn diện",
      "Chủ động nhịp độ tập luyện",
    ],
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=85",
    alt: "Không gian tập gym với máy tập và tạ",
    note: "Từng lần lặp. Từng bước tiến.",
  },
  {
    id: "balance",
    label: "Yoga & cân bằng",
    icon: Leaf,
    kicker: "02 / FIND YOUR BALANCE",
    title: "Chậm lại một nhịp.\nKết nối với cơ thể.",
    description:
      "Dành thời gian cho hơi thở, sự linh hoạt và khả năng giữ thăng bằng. Yoga gợi mở một cách vận động nhẹ nhàng để bạn chăm sóc cả thể chất lẫn tinh thần.",
    benefits: [
      "Tăng sự linh hoạt của cơ thể",
      "Rèn luyện khả năng thăng bằng",
      "Thư giãn sau một ngày bận rộn",
    ],
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1400&q=85",
    alt: "Người tập yoga trong không gian tràn ánh sáng",
    note: "Hít thở sâu. Tìm lại cân bằng.",
  },
  {
    id: "community",
    label: "Tập luyện cùng nhau",
    icon: Users,
    kicker: "03 / BETTER TOGETHER",
    title: "Thêm đồng đội.\nThêm động lực.",
    description:
      "Một người bạn tập có thể khiến buổi vận động trở nên thú vị hơn. Khám phá các hình thức tập nhóm, chia sẻ mục tiêu và tìm nguồn năng lượng từ những người cùng đam mê.",
    benefits: [
      "Kết nối qua từng buổi tập",
      "Đa dạng hình thức vận động",
      "Cùng nhau giữ nhịp tập luyện",
    ],
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=85",
    alt: "Vận động viên tập sức mạnh trong phòng gym",
    note: "Năng lượng tốt luôn được lan tỏa.",
  },
];

const faqs = [
  {
    question: "Tôi cần làm gì để bắt đầu?",
    answer:
      "Tạo tài khoản thành viên, đăng nhập và chọn gói tập phù hợp. Sau khi tạo yêu cầu đăng ký, bạn thanh toán tiền mặt tại quầy. Gói tập được kích hoạt khi nhân viên xác nhận đã nhận tiền.",
  },
  {
    question: "Gói tháng, quý và năm khác nhau như thế nào?",
    answer:
      "Các gói được phân biệt theo giá, thời hạn sử dụng và quyền lợi cụ thể. Gói tháng có thời hạn 1 tháng, gói quý là 3 tháng và gói năm là 12 tháng. Bạn có thể xem tổng giá và quyền lợi ngay trên từng gói trước khi đăng ký.",
  },
  {
    question: "Gia hạn có làm mất những ngày tập còn lại không?",
    answer:
      "Khi gia hạn cùng gói hoặc chọn gói cùng giá, thời hạn mới được nối tiếp sau thời gian đã thanh toán. Bạn có thể xem trước số tiền và thời hạn dự kiến trước khi xác nhận yêu cầu.",
  },
  {
    question: "Khi chuyển lên gói năm, phí được tính thế nào?",
    answer:
      "Nếu gói năm có giá cao hơn gói đang dùng và bạn chưa trả trước các kỳ tương lai, giá trị những ngày còn lại của gói hiện tại sẽ được trừ vào giá gói năm. Kỳ 12 tháng mới bắt đầu từ ngày xác nhận thanh toán. Nếu đã trả trước các kỳ tiếp theo, gói mới sẽ nối tiếp sau toàn bộ thời gian đã mua; chi tiết được hiển thị trước khi đăng ký.",
  },
  {
    question: "Tôi có thể thanh toán trực tuyến không?",
    answer:
      "Hiện tại, bạn tạo yêu cầu đăng ký hoặc gia hạn trên website và thanh toán tiền mặt tại quầy lễ tân. Bạn có thể theo dõi trạng thái yêu cầu, lịch sử thanh toán và hóa đơn trong tài khoản thành viên.",
  },
];

export function HomePage() {
  const { currentUser } = useAuth();
  const [activityIndex, setActivityIndex] = useState(0);
  const [catalog, setCatalog] = useState<{
    packages: MembershipPackage[];
    error: string;
  }>({ packages: [], error: "" });
  const activity = activities[activityIndex];
  const accountPath = currentUser ? homeForRole(currentUser.role) : "/register";
  const accountLabel = currentUser
    ? "Không gian của tôi"
    : "Bắt đầu hành trình";
  const packageAction =
    !currentUser || currentUser.role === "MEMBER"
      ? "Đăng ký gói tập"
      : currentUser.role === "CENTER_MANAGER"
        ? "Quản lý gói tập"
        : currentUser.role === "RECEPTIONIST"
          ? "Đăng ký tại quầy"
          : "Không gian của tôi";

  useEffect(() => {
    const refresh = () => {
      membershipApi
        .listPublicPackages()
        .then((pkgs) => {
          setCatalog({
            packages: pkgs.sort((a, b) => a.price - b.price),
            error: "",
          });
        })
        .catch((error: unknown) => {
          setCatalog({
            packages: [],
            error:
              error instanceof Error
                ? error.message
                : "Chưa thể tải danh sách gói tập từ máy chủ.",
          });
        });
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <div className="titan-home" id="top">
      <a className="skip-link" href="#home-main">
        Đến nội dung chính
      </a>
      <header className="home-header">
        <div className="home-container home-header-inner">
          <Link
            className="home-brand"
            to="/"
            aria-label="Titan Arena — Trang chủ"
          >
            <span className="home-brand-icon">
              <Flame size={25} aria-hidden="true" />
            </span>
            <span>
              TITAN ARENA<small>SPORTS & FITNESS CENTER</small>
            </span>
          </Link>
          <nav className="home-nav" aria-label="Điều hướng trang chủ">
            <a href="#experiences">Trải nghiệm</a>
            <Link to="/packages">Gói tập & so sánh</Link>
            <a href="#journey">Cách tham gia</a>
            <a href="#questions">Giải đáp</a>
          </nav>
          <div className="home-header-actions">
            {!currentUser && (
              <Link className="home-login" to="/login">
                Đăng nhập
              </Link>
            )}
            <Link
              className="home-button home-button-lime home-header-cta"
              to={accountPath}
            >
              {currentUser ? "Không gian của tôi" : "Trở thành thành viên"}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="home-main">
        <section className="home-hero" aria-labelledby="hero-title">
          <div className="home-hero-photo">
            <img
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2000&q=90"
              alt="Phòng tập với hệ thống máy tập và tạ"
              fetchPriority="high"
            />
            <span className="home-hero-image-index" aria-hidden="true">
              TITAN ARENA <span>01 / MOVE WITH PURPOSE</span>
            </span>
          </div>
          <div className="home-container home-hero-inner">
            <div className="home-hero-copy">
              <span className="home-kicker">
                <span /> KHÔNG GIAN CHO MỌI MỤC TIÊU
              </span>
              <h1 id="hero-title">
                Mạnh mẽ hơn.
                <br />
                Từng ngày.
                <br />
                <em>Theo cách bạn.</em>
              </h1>
              <p>
                Một buổi tập tốt có thể thay đổi cả ngày của bạn.
                <br className="home-wide-break" /> Cùng Titan Arena biến mỗi
                chuyển động thành một bước tiến.
              </p>
              <div className="home-hero-actions">
                <a className="home-button home-button-lime" href="#memberships">
                  Khám phá gói tập <ArrowUpRight size={20} aria-hidden="true" />
                </a>
                <a className="home-text-link" href="#experiences">
                  Tìm cảm hứng tập luyện{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              </div>
              <div className="home-hero-caption">
                <span><Dumbbell size={15} aria-hidden="true" /> Sức mạnh</span>
                <span><Leaf size={15} aria-hidden="true" /> Cân bằng</span>
                <span><Users size={15} aria-hidden="true" /> Kết nối</span>
              </div>
            </div>
            <div className="home-photo-label">
              <span className="home-photo-label-icon">
                <Dumbbell size={23} aria-hidden="true" />
              </span>
              <div>
                <small>MỖI CHUYỂN ĐỘNG ĐỀU CÓ Ý NGHĨA</small>
                <strong>Bắt đầu hành trình của riêng bạn.</strong>
              </div>
            </div>
            <a
              className="home-scroll"
              href="#experiences"
              aria-label="Khám phá trải nghiệm tập luyện"
            >
              <ArrowDown size={20} aria-hidden="true" />
            </a>
          </div>
        </section>

        <div className="home-benefit-strip">
          <div className="home-container home-benefit-inner">
            <div>
              <CalendarDays aria-hidden="true" />
              <span>
                Nhịp tập của bạn<small>Lựa chọn tháng, quý hoặc năm</small>
              </span>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" />
              <span>
                Quyền lợi rõ ràng<small>Giá và thời hạn trên từng gói</small>
              </span>
            </div>
            <div>
              <Users aria-hidden="true" />
              <span>
                Luôn có người hỗ trợ
                <small>Đăng ký và thanh toán tại quầy</small>
              </span>
            </div>
          </div>
        </div>

        <section
          className="home-section home-experiences"
          id="experiences"
          aria-labelledby="experiences-title"
        >
          <div className="home-container">
            <div className="home-section-heading">
              <div>
                <span className="home-kicker">
                  01 / TÌM NHỊP VẬN ĐỘNG RIÊNG
                </span>
                <h2 id="experiences-title">
                  Một mục tiêu.
                  <br />
                  Nhiều cách để bắt đầu.
                </h2>
              </div>
              <p>
                Không cần giống bất kỳ ai. Khám phá hình thức vận động phù hợp
                với sở thích và mục tiêu của bạn.
              </p>
            </div>
            <div
              className="home-activity-picker"
              role="group"
              aria-label="Chọn hình thức tập luyện"
            >
              {activities.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={index === activityIndex}
                    aria-controls="home-activity-detail"
                    onClick={() => setActivityIndex(index)}
                  >
                    <Icon size={19} aria-hidden="true" />
                    {item.label}
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <div className="home-activity-detail" id="home-activity-detail">
              <div className="home-activity-image">
                <img
                  key={activity.id}
                  src={activity.image}
                  alt={activity.alt}
                  loading="lazy"
                />
                <span>{activity.note}</span>
              </div>
              <div
                className="home-activity-copy"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="home-kicker">{activity.kicker}</span>
                <h3>{activity.title}</h3>
                <p>{activity.description}</p>
                <ul>
                  {activity.benefits.map((benefit) => (
                    <li key={benefit}>
                      <Check size={17} aria-hidden="true" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                <a href="#memberships" className="home-text-link">
                  Tìm gói tập phù hợp{" "}
                  <ArrowUpRight size={19} aria-hidden="true" />
                </a>
              </div>
            </div>
            <p className="home-experience-note">
              Gợi ý hình thức tập luyện. Quyền lợi áp dụng được ghi cụ thể trong
              từng gói thành viên.
            </p>
          </div>
        </section>

        <section
          className="home-section home-memberships"
          id="memberships"
          aria-labelledby="memberships-title"
        >
          <div className="home-container">
            <div className="home-section-heading">
              <div>
                <span className="home-kicker">02 / ĐẦU TƯ CHO CHÍNH MÌNH</span>
                <h2 id="memberships-title">
                  Chọn gói tập.
                  <br />
                  Mở hành trình mới.
                </h2>
              </div>
              <div className="home-plan-intro">
                <p>
                  Linh hoạt theo thời gian của bạn. Chọn kỳ hạn, xem quyền lợi
                  và bắt đầu khi đã sẵn sàng.
                </p>
                <span>
                  <CreditCard size={17} aria-hidden="true" /> Giá trọn gói ·
                  Thanh toán tại quầy
                </span>
              </div>
            </div>
            {catalog.error ? (
              <div className="home-catalog-state" role="alert">
                <p>{catalog.error}</p>
                <button
                  className="home-button home-button-dark"
                  type="button"
                  onClick={() =>
                    membershipApi
                      .listPublicPackages()
                      .then((pkgs) =>
                        setCatalog({
                          packages: pkgs.sort((a, b) => a.price - b.price),
                          error: "",
                        }),
                      )
                      .catch((err: unknown) =>
                        setCatalog({
                          packages: [],
                          error:
                            err instanceof Error
                              ? err.message
                              : "Chưa thể tải danh sách gói tập từ máy chủ.",
                        }),
                      )
                  }
                >
                  Thử lại <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            ) : catalog.packages.length === 0 ? (
              <div className="home-catalog-state">
                <Dumbbell size={30} aria-hidden="true" />
                <h3>Các gói tập đang được cập nhật</h3>
                <p>
                  Bạn có thể tạo tài khoản trước hoặc liên hệ quầy lễ tân để
                  được hỗ trợ.
                </p>
                <Link className="home-button home-button-dark" to={accountPath}>
                  {accountLabel}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <div className="home-plan-grid">
                {catalog.packages.map((pkg) => (
                  <article
                    className={`home-plan ${pkg.durationMonths === 3 ? "home-plan-recommended" : ""}`}
                    key={pkg.id}
                  >
                    <div className="home-plan-top">
                      <span>
                        <CalendarDays size={16} aria-hidden="true" />
                        {durationLabel(pkg.durationMonths)}
                      </span>
                      {pkg.durationMonths === 3 && (
                        <span className="home-plan-badge">
                          <Sparkles size={13} aria-hidden="true" />
                          Gợi ý sử dụng
                        </span>
                      )}
                    </div>
                    <h3>{pkg.name}</h3>
                    <div className="home-plan-price">
                      {formatMoney(pkg.price)}
                    </div>
                    <p className="home-plan-period">
                      Thanh toán một lần / {durationLabel(pkg.durationMonths)}
                    </p>
                    <div className="home-plan-equivalent">
                      {pkg.durationMonths > 1 ? (
                        <>
                          Tương đương{" "}
                          <strong>
                            {formatMoney(
                              Math.round(pkg.price / pkg.durationMonths),
                            )}
                            /tháng
                          </strong>
                        </>
                      ) : (
                        <>Một khởi đầu linh hoạt cho bạn</>
                      )}
                    </div>
                    <ul>
                      {(pkg.benefits ?? []).map((benefit, index) => (
                        <li key={`${index}-${benefit}`}>
                          <Check size={17} aria-hidden="true" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      className={`home-button ${pkg.durationMonths === 3 ? "home-button-lime" : "home-button-outline"}`}
                      to={accountPath}
                    >
                      {packageAction}
                      <ArrowUpRight size={18} aria-hidden="true" />
                    </Link>
                  </article>
                ))}
              </div>
            )}
            <div className="home-catalog-link">
              <span>Một lựa chọn phù hợp bắt đầu từ thông tin rõ ràng.</span>
              <Link to="/packages">
                Xem & so sánh tất cả gói tập
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <div className="home-plan-assurance">
              <ShieldCheck size={20} aria-hidden="true" />
              <p>
                Đã có gói tập? Xem trước chi phí gia hạn hoặc chuyển gói trong
                tài khoản của bạn. Thời gian đã thanh toán luôn được tính khi
                tạo yêu cầu mới.
              </p>
              <Link to={currentUser ? accountPath : "/login"}>
                Vào tài khoản <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section
          className="home-section home-journey"
          id="journey"
          aria-labelledby="journey-title"
        >
          <div className="home-container home-journey-grid">
            <div className="home-journey-intro">
              <span className="home-kicker">03 / TỪ Ý ĐỊNH ĐẾN HÀNH ĐỘNG</span>
              <h2 id="journey-title">
                Buổi tập đầu tiên
                <br />
                bắt đầu từ đây.
              </h2>
              <p>
                Ít bước hơn để bắt đầu.
                <br />
                Nhiều năng lượng hơn để tiến về phía trước.
              </p>
              <Link className="home-text-link" to={accountPath}>
                {accountLabel}
                <ArrowUpRight size={20} aria-hidden="true" />
              </Link>
              <Flame
                className="home-journey-flame"
                size={130}
                strokeWidth={1}
                aria-hidden="true"
              />
            </div>
            <ol className="home-steps">
              <li>
                <span className="home-step-number">01</span>
                <div>
                  <h3>Tạo tài khoản của bạn</h3>
                  <p>
                    Đăng ký thông tin cá nhân để có một không gian riêng cho
                    hành trình tập luyện.
                  </p>
                </div>
                <Users size={24} aria-hidden="true" />
              </li>
              <li>
                <span className="home-step-number">02</span>
                <div>
                  <h3>Chọn một gói phù hợp</h3>
                  <p>
                    So sánh giá, quyền lợi và thời hạn. Tạo yêu cầu đăng ký ngay
                    trong tài khoản.
                  </p>
                </div>
                <CalendarDays size={24} aria-hidden="true" />
              </li>
              <li>
                <span className="home-step-number">03</span>
                <div>
                  <h3>Thanh toán & sẵn sàng tập luyện</h3>
                  <p>
                    Thanh toán tiền mặt tại quầy. Gói được kích hoạt sau khi
                    nhân viên xác nhận thanh toán.
                  </p>
                </div>
                <Dumbbell size={24} aria-hidden="true" />
              </li>
            </ol>
          </div>
        </section>

        <section
          className="home-section home-account-section"
          aria-labelledby="account-title"
        >
          <div className="home-container home-account-grid">
            <div className="home-account-visual" aria-hidden="true">
              <span className="home-account-overline">
                TITAN / MEMBER SPACE
              </span>
              <div className="home-membership-card">
                <div>
                  <span>TITAN ARENA</span>
                  <Flame size={28} />
                </div>
                <small>HÀNH TRÌNH CỦA BẠN</small>
                <strong>
                  Mọi bước tiến,
                  <br />
                  trong tầm tay.
                </strong>
                <div>
                  <span>MEMBERSHIP</span>
                  <ArrowUpRight size={30} />
                </div>
              </div>
              <div className="home-account-float">
                <span>
                  <ShieldCheck size={23} />
                </span>
                <div>
                  <strong>Rõ ràng từng quyền lợi</strong>
                  <small>Chủ động từng kế hoạch</small>
                </div>
              </div>
            </div>
            <div className="home-account-copy">
              <span className="home-kicker">KHÔNG GIAN THÀNH VIÊN</span>
              <h2 id="account-title">
                Tập trung tập luyện.
                <br />
                Mọi thông tin ở đây.
              </h2>
              <p>
                Từ lần đăng ký đầu tiên đến lần gia hạn tiếp theo, theo dõi
                thông tin gói tập ngay trong tài khoản của bạn.
              </p>
              <ul>
                <li>
                  <CalendarDays size={22} aria-hidden="true" />
                  <div>
                    <strong>Nắm rõ thời hạn gói tập</strong>
                    <span>
                      Xem gói đang dùng, ngày bắt đầu và ngày hết hạn.
                    </span>
                  </div>
                </li>
                <li>
                  <CreditCard size={22} aria-hidden="true" />
                  <div>
                    <strong>Theo dõi đăng ký & thanh toán</strong>
                    <span>Tra cứu trạng thái yêu cầu và hóa đơn của bạn.</span>
                  </div>
                </li>
                <li>
                  <Plus size={22} aria-hidden="true" />
                  <div>
                    <strong>Chủ động gia hạn, chuyển gói</strong>
                    <span>Xem trước chi phí trước khi xác nhận yêu cầu.</span>
                  </div>
                </li>
              </ul>
              <Link className="home-button home-button-dark" to={accountPath}>
                {accountLabel}
                <ArrowUpRight size={19} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section
          className="home-section home-faq"
          id="questions"
          aria-labelledby="questions-title"
        >
          <div className="home-container home-faq-grid">
            <div>
              <span className="home-kicker">THÊM MỘT CHÚT THÔNG TIN</span>
              <h2 id="questions-title">
                Bạn hỏi.
                <br />
                Titan giải đáp.
              </h2>
              <p>
                Những điều cần biết để yên tâm
                <br />
                bắt đầu hành trình tập luyện.
              </p>
              <span className="home-faq-support">
                <Users size={19} aria-hidden="true" /> Cần thêm hỗ trợ? Hãy gặp
                lễ tân tại trung tâm.
              </span>
            </div>
            <div className="home-faq-list">
              {faqs.map((faq) => (
                <details key={faq.question} name="home-faq">
                  <summary>
                    {faq.question}
                    <ChevronDown size={20} aria-hidden="true" />
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="home-final-cta" aria-labelledby="final-cta-title">
          <div className="home-container">
            <div>
              <span className="home-kicker">
                HÔM NAY LÀ MỘT NGÀY ĐẸP ĐỂ BẮT ĐẦU
              </span>
              <h2 id="final-cta-title">
                Phiên bản tốt hơn của bạn
                <br />
                đang ở phía trước.
              </h2>
            </div>
            <Link to={accountPath} className="home-button home-button-dark">
              {accountLabel}
              <ArrowUpRight size={21} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-container">
          <div className="home-footer-top">
            <Link
              className="home-brand"
              to="/"
              aria-label="Titan Arena — Trang chủ"
            >
              <span className="home-brand-icon">
                <Flame size={25} aria-hidden="true" />
              </span>
              <span>
                TITAN ARENA<small>SPORTS & FITNESS CENTER</small>
              </span>
            </Link>
            <p>
              Một không gian. Nhiều mục tiêu.
              <br />
              Cùng nhau tiến về phía trước.
            </p>
            <nav aria-label="Liên kết cuối trang">
              <a href="#experiences">Trải nghiệm</a>
              <a href="#memberships">Gói tập</a>
              <a href="#questions">Câu hỏi thường gặp</a>
            </nav>
          </div>
          <div className="home-footer-bottom">
            <span>
              © {new Date().getFullYear()} Titan Arena. Cùng bạn khỏe hơn mỗi
              ngày.
            </span>
            <a href="#top">
              Về đầu trang <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
