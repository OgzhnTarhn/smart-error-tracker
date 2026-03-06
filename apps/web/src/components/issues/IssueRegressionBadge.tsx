interface IssueRegressionBadgeProps {
    isRegression: boolean;
    regressionCount?: number;
}

export default function IssueRegressionBadge({
    isRegression,
    regressionCount = 0,
}: IssueRegressionBadgeProps) {
    if (!isRegression) return null;

    const label = regressionCount > 1
        ? `Regression x${regressionCount}`
        : 'Regression';

    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30">
            {label}
        </span>
    );
}
