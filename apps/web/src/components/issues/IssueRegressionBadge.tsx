interface IssueRegressionBadgeProps {
    isRegression: boolean;
    regressionCount?: number;
    variant?: 'default' | 'enterprise';
}

export default function IssueRegressionBadge({
    isRegression,
    regressionCount = 0,
    variant = 'default',
}: IssueRegressionBadgeProps) {
    if (!isRegression) return null;

    const label = regressionCount > 1
        ? `Regression x${regressionCount}`
        : 'Regression';

    const className =
        variant === 'enterprise'
            ? 'enterprise-chip'
            : 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30';

    return (
        <span className={className}>
            {label}
        </span>
    );
}
