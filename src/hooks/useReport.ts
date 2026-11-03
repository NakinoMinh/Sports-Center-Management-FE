import { useEffect, useState } from "react";
import { ApiError } from "../services/apiClient";
import { describeError, fieldErrorsOf } from "../services/apiErrors";
import { classApi } from "../services/classApi";
import { reportApi } from "../services/reportApi";
import type { Sport, TrainingClass } from "../types/classes";
import type { ReportQuery, ReportResult } from "../types/reports";
import type { FieldErrors } from "../utils/validation";
import { useToast } from "./useToast";

type ReportState = {
  query: ReportQuery | null;
  result: ReportResult | null;
  hasError: boolean;
  fieldErrors: FieldErrors;
};

export function useReport(query: ReportQuery) {
  const toast = useToast();
  const [state, setState] = useState<ReportState>({
    query: null, result: null, hasError: false, fieldErrors: {},
  });

  useEffect(() => {
    let isCurrent = true;
    async function load() {
      try {
        let result: ReportResult;
        if (query.tab === "revenue") {
          result = { tab: "revenue", report: await reportApi.getRevenueReport(query) };
        } else if (query.tab === "members") {
          result = { tab: "members", report: await reportApi.getMemberReport(query) };
        } else {
          result = { tab: "classes", report: await reportApi.getClassReport(query) };
        }
        if (isCurrent) setState({ query, result, hasError: false, fieldErrors: {} });
      } catch (error) {
        if (!isCurrent) return;
        const fieldErrors: FieldErrors = {};
        for (const field of Object.keys(fieldErrorsOf(error))) {
          fieldErrors[field] = "Giá trị chưa hợp lệ. Vui lòng kiểm tra và chọn lại.";
        }
        if (error instanceof ApiError && error.code === "INVALID_REPORT_DATE_RANGE") {
          const message = query.tab === "members"
            ? "Vui lòng chọn ngày hợp lệ và Đến ngày bằng hoặc sau Từ ngày."
            : "Vui lòng kiểm tra thứ tự ngày và chọn khoảng tối đa 366 ngày.";
          fieldErrors.from = message;
          fieldErrors.to = message;
        }
        const hasLostAccess = error instanceof ApiError && [401, 403, 423].includes(error.status);
        setState(previous => ({
          query, result: hasLostAccess ? null : previous.result, hasError: true, fieldErrors,
        }));
        toast.error(describeError(error));
      }
    }
    void load();
    // An older response must not overwrite a newer filter or a different tab.
    return () => { isCurrent = false; };
  }, [query, toast]);

  return { ...state, isLoading: state.query !== query };
}

export function useReportCatalog(isEnabled: boolean) {
  const toast = useToast();
  const [catalog, setCatalog] = useState<{ sports: Sport[]; classes: TrainingClass[] } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failedAttempt, setFailedAttempt] = useState<number | null>(null);
  useEffect(() => {
    if (!isEnabled) return;
    let isCurrent = true;
    async function load() {
      try {
        const [sports, classes] = await Promise.all([classApi.listSports(), classApi.listClasses()]);
        if (isCurrent) setCatalog({ sports, classes });
      } catch (error) {
        if (!isCurrent) return;
        setFailedAttempt(attempt);
        toast.error(describeError(error));
      }
    }
    void load();
    return () => { isCurrent = false; };
  }, [isEnabled, attempt, toast]);
  return { catalog, hasError: failedAttempt === attempt, retry: () => setAttempt(value => value + 1) };
}
