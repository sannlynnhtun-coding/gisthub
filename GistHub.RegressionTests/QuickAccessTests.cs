using System.Reflection;
using GistHub.Layout;
using Microsoft.JSInterop;

static class QuickAccessTests
{
    private const BindingFlags Private = BindingFlags.Instance | BindingFlags.NonPublic;
    private static void Set(NavMenu menu, string name, object value) => typeof(NavMenu).GetField(name, Private)!.SetValue(menu, value);
    private static List<string> Order(NavMenu menu) => (List<string>)typeof(NavMenu).GetField("QuickIds", Private)!.GetValue(menu)!;
    private static Task Invoke(NavMenu menu, string name, params object[] args) => (Task)typeof(NavMenu).GetMethod(name, Private)!.Invoke(menu, args)!;
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }

    public static async Task RunAsync()
    {
        var menu = new NavMenu();
        var storage = new PreferenceModule();
        Set(menu, "Module", storage);
        Set(menu, "Loaded", true);
        Set(menu, "SelectedTab", "Quick Access");
        Set(menu, "QuickIds", new List<string> { "sound", "json-parser", "appearance" });
        var visible = (System.Collections.IEnumerable)typeof(NavMenu).GetProperty("VisibleQuickCommands", Private)!.GetValue(menu)!;
        var ids = visible.Cast<object>().Select(c => (string)c.GetType().GetProperty("Id")!.GetValue(c)!).ToArray();
        Check(ids.SequenceEqual(new[] { "sound", "json-parser", "appearance" }), "Quick Access must show commands in saved order.");
        await Invoke(menu, "MoveAsync", "appearance", -1);
        Check(Order(menu).SequenceEqual(new[] { "sound", "appearance", "json-parser" }), "Reorder must update the saved order.");
        Check(storage.Writes == 1, "Reorder must save once.");
        await Invoke(menu, "ReorderAsync", "sound", "sound", false);
        await Invoke(menu, "ReorderAsync", "unknown", "sound", false);
        Check(storage.Writes == 1, "Invalid and self drops must not write.");
        storage.Fail = true;
        await Invoke(menu, "MoveAsync", "json-parser", -1);
        Check(Order(menu).SequenceEqual(new[] { "sound", "appearance", "json-parser" }), "Failed saves must retain the previous order.");
        Check(((string)typeof(NavMenu).GetField("Status", Private)!.GetValue(menu)!).Contains("could not be saved"), "Failed saves must be visible.");
        Console.WriteLine("PASS: Quick Access preserves saved order, ignores invalid drops and retains order on failed saves.");
    }

    private sealed class PreferenceModule : IJSObjectReference
    {
        public int Writes;
        public bool Fail;
        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args)
        {
            if (Fail) throw new JSException("Storage denied");
            Writes++;
            return ValueTask.FromResult(default(TValue)!);
        }
        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args) => InvokeAsync<TValue>(identifier, args);
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
