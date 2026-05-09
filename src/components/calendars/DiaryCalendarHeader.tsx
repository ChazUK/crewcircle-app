import { format } from "date-fns";
import { Button } from "heroui-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Text, View } from "react-native";

type XDateLike = {
  getFullYear: () => number;
  getMonth: () => number;
  getTime: () => number;
};

type Props = {
  month?: XDateLike;
  addMonth?: (num: number) => void;
};

export function DiaryCalendarHeader({ month, addMonth }: Props) {
  if (!month || !addMonth) return null;

  const title = format(new Date(month.getTime()), "MMMM yyyy");

  const goToToday = () => {
    const today = new Date();
    const monthsDiff =
      (today.getFullYear() - month.getFullYear()) * 12 + (today.getMonth() - month.getMonth());
    if (monthsDiff !== 0) addMonth(monthsDiff);
  };

  return (
    <View className="flex-row items-center justify-between px-2 py-2">
      <Text className="text-base font-semibold text-foreground">{title}</Text>
      <View className="flex-row items-center gap-2">
        <Button variant="ghost" size="sm" onPress={goToToday}>
          Today
        </Button>
        <Button variant="ghost" size="sm" hitSlop={5} isIconOnly onPress={() => addMonth(-1)}>
          <ChevronLeft size={20} />
        </Button>
        <Button variant="ghost" size="sm" hitSlop={5} isIconOnly onPress={() => addMonth(1)}>
          <ChevronRight size={20} />
        </Button>
      </View>
    </View>
  );
}
