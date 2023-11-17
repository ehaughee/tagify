import { Cascader } from "antd";

interface TagOption {
  value: string;
  label: string;
}

export interface Tag {
  id: string;
  name: string;
}

interface TagSelectProps {
  selectedTags: Tag[];
  tags: Tag[];
}

function getOptions(tags: Tag[]): TagOption[] {
  return tags.map(tag => ({ value: tag.id, label: tag.name }))
}

function onChange(values: any) {
  console.debug(`Selected tags: ${values.join(", ")}`)
}

const TagSelect: React.FC<TagSelectProps> = (props) => {
  const tags = getOptions(props.tags);
  const selectedTags = props.selectedTags.map(tag => tag.name.toLocaleLowerCase())

  return (
    <Cascader
      style={{minWidth: "100%"}}
      defaultValue={selectedTags}
      options={tags}
      maxTagPlaceholder="..."
      maxTagCount={5}
      multiple
      changeOnSelect
      showSearch
      onChange={onChange}
    />
  )
}

export default TagSelect;