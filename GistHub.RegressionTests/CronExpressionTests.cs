using GistHub.Services;

internal static class CronExpressionTests
{
    public static void Run()
    {
        Check(CronExpressionHelper.Describe("* * * * *") == "Every minute.", "Default schedule");
        Check(CronExpressionHelper.Describe("*/15 * * * *") == "Every 15 minutes.", "Minute interval");
        Check(CronExpressionHelper.Describe("0 * * * *") == "Every hour at minute 00.", "Hourly schedule");
        Check(CronExpressionHelper.Describe(" 0\t9 * * * ") == "Every day at 09:00.", "Whitespace and daily schedule");
        Check(CronExpressionHelper.Describe("*/7 * * * *").Contains("from 0 through 59"), "Uneven steps must describe field resets");
        Check(CronExpressionHelper.Describe("0 9 1 JAN mon-fri").Contains("1 of the month or MON through FRI"), "Named ranges and day OR");
        Check(CronExpressionHelper.Describe("0 9 */2 * MON").Contains("of the month and MON"), "Wildcard day AND");
        Check(CronExpressionHelper.Describe("0,30 9-17/2 * * 0,7").Contains("SUN, SUN"), "Lists, range steps, Sunday aliases");
        foreach (var value in new[] { "", "* * * *", "* * * * * *", "60 * * * *", "* 24 * * *", "* * 0 * *", "* * * 13 *", "* * * * 8", "*/0 * * * *", "*/60 * * * *", "1/2 * * * *", "5-1 * * * *", "1,,2 * * * *", "1- * * * *", "* * * FOO *", "@daily", "0 0 ? * MON", "0 0 L * *", "0 0 * * MON#2", "+1 * * * *", "*/2147483648 * * * *" })
        {
            try { CronExpressionHelper.Describe(value); }
            catch (FormatException) { continue; }
            throw new InvalidOperationException($"Invalid cron accepted: {value}");
        }
        Console.WriteLine("PASS: cron descriptions, named fields, day matching, steps, and validation.");
    }

    private static void Check(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }
}
