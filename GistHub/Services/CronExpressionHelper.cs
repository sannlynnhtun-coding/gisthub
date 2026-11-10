using System.Globalization;

namespace GistHub.Services;

public static class CronExpressionHelper
{
    private static readonly string[] Fields = ["Minute", "Hour", "Day of month", "Month", "Day of week"];
    private static readonly int[] Min = [0, 0, 1, 1, 0], Max = [59, 23, 31, 12, 7];
    private static readonly string[] Months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    private static readonly string[] Days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    public static string Describe(string expression)
    {
        var fields = expression.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        if (fields.Length != 5) throw new FormatException("Enter exactly five fields: minute, hour, day of month, month, day of week.");
        var descriptions = new string[5];
        for (var i = 0; i < fields.Length; i++)
        {
            try { descriptions[i] = DescribeField(fields[i], i); }
            catch (FormatException) { throw new FormatException($"{Fields[i]}: use {Min[i]}–{Max[i]}, *, comma lists, ascending ranges, or positive steps on * or a range. Months also accept JAN–DEC; weekdays accept SUN–SAT."); }
        }
        if (fields.All(field => field == "*")) return "Every minute.";
        if (fields.Skip(1).All(field => field == "*") && fields[0].StartsWith("*/") && int.TryParse(fields[0][2..], out var step) && 60 % step == 0)
            return step == 1 ? "Every minute." : $"Every {step} minutes.";
        if (int.TryParse(fields[0], out var minute))
        {
            if (fields.Skip(1).All(field => field == "*")) return $"Every hour at minute {minute:00}.";
            if (int.TryParse(fields[1], out var hour) && fields.Skip(2).All(field => field == "*")) return $"Every day at {hour:00}:{minute:00}.";
        }
        var dayJoin = !fields[2].StartsWith('*') && !fields[4].StartsWith('*') ? " or " : " and ";
        return $"Minute: {descriptions[0]}; hour: {descriptions[1]}; month: {descriptions[3]}; day: ({descriptions[2]} of the month{dayJoin}{descriptions[4]} of the week).";
    }

    private static string DescribeField(string field, int index)
    {
        var descriptions = new List<string>();
        foreach (var item in field.Split(','))
        {
            var parts = item.Split('/');
            if (parts.Length > 2) throw new FormatException();
            var range = parts[0].Split('-');
            var wildcard = parts[0] == "*";
            if (range.Length > 2 || (parts.Length == 2 && !wildcard && range.Length != 2)) throw new FormatException();
            var start = wildcard ? Min[index] : ParseValue(range[0], index);
            var end = wildcard ? Max[index] : range.Length == 2 ? ParseValue(range[1], index) : start;
            if (start > end) throw new FormatException();
            var description = wildcard ? "every value" : start == end ? Label(start, index) : $"{Label(start, index)} through {Label(end, index)}";
            if (parts.Length == 2)
            {
                if (!int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var step) || step < 1 || step > Max[index]) throw new FormatException();
                description = $"every {step} values from {Label(start, index)} through {Label(end, index)}";
            }
            descriptions.Add(description);
        }
        return string.Join(", ", descriptions);
    }

    private static int ParseValue(string text, int index)
    {
        var names = index == 3 ? Months : index == 4 ? Days : [];
        var named = Array.FindIndex(names, name => name.Equals(text, StringComparison.OrdinalIgnoreCase));
        if (named >= 0) return index == 3 ? named + 1 : named;
        if (!int.TryParse(text, NumberStyles.None, CultureInfo.InvariantCulture, out var value) || value < Min[index] || value > Max[index]) throw new FormatException();
        return value;
    }

    private static string Label(int value, int index) => index == 3 ? Months[value - 1] : index == 4 ? Days[value % 7] : value.ToString(CultureInfo.InvariantCulture);
}
