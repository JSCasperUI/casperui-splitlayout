import {View} from "@casperui/core/view/View";
import {Context} from "@casperui/core/content/Context";
import {JFragment} from "@casperui/core/app/JFragment";
import {BXMLInflater} from "@casperui/core/view/inflater/BXMLInflater";

export enum SplitType {
    CONTENT,
    HORIZONTAL,
    VERTICAL
}
const TAG_DIV = "div"
const classes = ["","horizontal","vertical"];
const main_class = "wgsl_split_layout"
const dividerName = "wgsl_divider"
const PROP_SIZE = "--size"

export interface SplitLayoutOptions {
    type: SplitType;
    name?: string;
    size?: number;
    children?: SplitLayoutOptions[];
}

export abstract class SplitLayout extends JFragment {

    private rootElement: View;
    private children: SplitLayout[] = [];
    // private dividers: View[] = [];
    private contentFragment: JFragment;

    constructor(context: Context, private options: SplitLayoutOptions) {
        super(context);
        this.rootElement = new View(context, TAG_DIV, {"class": `${main_class} ${classes[this.options.type]}`});
    }

    onCreated() {
        super.onCreated();
        if (this.options.children) {
            this.setupContainer();
        } else if (this.options.type === SplitType.CONTENT) {
            this.setupContentArea();
        }
    }

    onCreateView(inflater: BXMLInflater, container: View): View {
        return this.rootElement;
    }

    setContentFragment(fragment: JFragment) {
        this.contentFragment = fragment;
        this.getFragmentManager().replaceFragment(555, this.contentFragment, this.rootElement)
    }

    private setupContentArea() {
        this.rootElement.addClass(main_class);

    }

    abstract createInstance(context: Context, options: SplitLayoutOptions): SplitLayout;

    abstract getFragmentInstance(context: Context, options: SplitLayoutOptions): JFragment;

    private setupContainer() {
        let index = 0
        let end = this.options.children.length - 1
        for (const child of this.options.children) {
            let instance = this.createInstance(this.ctx(), child)

            this.children.push(instance);
            this.getFragmentManager().pushFragment(index, instance, this.rootElement);
            if (child.type === SplitType.CONTENT)
                instance.setContentFragment(this.getFragmentInstance(this.ctx(), child))

            instance.setPropertySize(child.size);
            if (index < end) this.addDivider(index++);

        }
    }

    private addDivider(divPos: number) {
        const divider = new View(this.ctx(), TAG_DIV, {"class": dividerName});

        // this.dividers.push(divider);
        this.rootElement.addView(divider);
        const ROUND = (v: number) => Math.round(v * 10) / 10;
        const GET_V = (sp: SplitLayout, isHorizontal: boolean) => {
            if (isHorizontal)
                return sp.getView().getWidth();
            return sp.getView().getHeight();
        }

        let isResizing = false;
        let isHorizontal = this.options.type === SplitType.HORIZONTAL;
        const clientAxis = isHorizontal ? 'clientX' : 'clientY';

        let startLength = 0
        let maxLength = 0
        let maxPercent = 0
        let startPosition = 0
        let dev = 2

        let leftChild: SplitLayout;
        let rightChild: SplitLayout;


        const onPointerMove = (e: PointerEvent) => {
            if (!isResizing) return;
            const pos = (e[clientAxis] - startPosition) + startLength + dev;
            let leftPosition = ROUND(Math.min(Math.max((pos / maxLength) * maxPercent, 2), maxPercent - 2));
            let rightPosition = ROUND(maxPercent - leftPosition);

            leftChild.setPropertySize(leftPosition);
            rightChild.setPropertySize(rightPosition);
        }
        const stop = () => {
            if (!isResizing) return;
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', stop, {capture:true});
            window.removeEventListener('pointercancel', stop, {capture:true});
        };

        divider.getElement().addEventListener("pointerdown",(e) => {
            isResizing = true;
            document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';


            leftChild = this.children[divPos]
            rightChild = this.children[divPos + 1]

            let dv = isHorizontal ? divider.getWidth() : divider.getHeight()

            startLength = GET_V(leftChild, isHorizontal)
            let end = GET_V(rightChild, isHorizontal)
            dev = dv / 2
            maxLength = startLength + end + dv
            maxPercent = Math.floor(leftChild.getPropertySize() + rightChild.getPropertySize())
            startPosition = e[clientAxis]
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', stop, {capture:true});
            window.addEventListener('pointercancel', stop, {capture:true});
        });

    }

    protected getPropertySize(): number {
        let size = this.getView().getElement().style.getPropertyValue(PROP_SIZE).replace("%", "");
        if (!size.length) {
            return 0;
        }
        return parseFloat(size)
    }

    protected setPropertySize(size: number) {
        this.getView().getElement().style.setProperty(PROP_SIZE, `${size}%`)
    }
}