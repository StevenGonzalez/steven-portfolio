import DraggableTitle from "../components/draggable-title";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <DraggableTitle
        fill
        lines={[
          "Hi, I'm Steven",
          "Senior Software Engineer",
          "I design reliable, performant software with pragmatic tradeoffs",
        ]}
      />
    </div>
  );
}
