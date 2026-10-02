// Width alone mistakes landscape phones for desktop displays.
export function isCompactHero({width,height}){
 return width<=760||(width<=1024&&height<=500&&window.matchMedia('(pointer:coarse)').matches)
}
