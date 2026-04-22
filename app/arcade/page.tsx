import ArcadeGame from "../../components/ArcadeGame";
import DraggableTitle from "../../components/draggable-title";

export const metadata = {
  title: "Minigame | Steven",
  description: "A small interactive arcade minigame inside Steven's software engineering portfolio.",
};

export default function ArcadePage() {
  return (
    <DraggableTitle
      lines={[
        "Minigame",
        "Collect stars. Survive the surge.",
      ]}
      fill={false}
    >
      <ArcadeGame />
    </DraggableTitle>
  );
}
