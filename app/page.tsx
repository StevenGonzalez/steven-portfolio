import DraggableTitle from "../components/DraggableTitle";

export default function Home() {
  return (
    <div className="spotlight-accent">
      <DraggableTitle
        lines={[
          "Hi, I'm Steven.",
          "Senior Software Engineer, clarity-first systems.",
          "I design reliable, performant software with pragmatic tradeoffs.",
        ]}
      />
    </div>
  );
}
